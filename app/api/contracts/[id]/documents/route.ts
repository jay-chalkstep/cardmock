import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { createServerAdminClient } from '@/lib/supabase/server';
import { extractTextFromWordDocument } from '@/lib/ai/document-diff';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/[id]/documents
 *
 * Get all documents for a contract
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/contracts/${id}/documents`, 'GET', { orgId });

    // Check if contract exists
    const { data: contract } = await supabaseServer
      .from('contracts')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!contract) {
      return notFoundResponse('Contract not found');
    }

    // Get documents
    const { data: documents, error } = await supabaseServer
      .from('contract_documents')
      .select('*')
      .eq('contract_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ documents: documents || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch documents');
  }
}

/**
 * POST /api/contracts/[id]/documents
 *
 * Upload a new document for a contract
 *
 * Body: FormData with file
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/contracts/${id}/documents`, 'POST', { orgId, userId });

    // Check if contract exists
    const { data: contract } = await supabaseServer
      .from('contracts')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!contract) {
      return notFoundResponse('Contract not found');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return badRequestResponse('File is required');
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];

    if (!allowedTypes.includes(file.type)) {
      return badRequestResponse('Only Word documents (.docx, .doc) are allowed');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return badRequestResponse('File size must be less than 10MB');
    }

    // New documents always start at version 1
    const nextVersion = 1;

    // Upload file to Supabase Storage
    const supabaseAdmin = createServerAdminClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${id}/${Date.now()}-v${nextVersion}.${fileExt}`;
    const filePath = `contract-documents/${fileName}`;

    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('contract-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Storage upload error:', uploadError);
      return errorResponse(uploadError, 'Failed to upload file');
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('contract-documents')
      .getPublicUrl(filePath);

    // Mark previous documents as not current
    await supabaseServer
      .from('contract_documents')
      .update({ is_current: false })
      .eq('contract_id', id)
      .eq('is_current', true);

    // Extract text from document for search (async, don't block upload)
    let searchableText: string | null = null;
    try {
      searchableText = await extractTextFromWordDocument(urlData.publicUrl);
      // Limit text length to prevent database issues (keep first 100k characters)
      if (searchableText && searchableText.length > 100000) {
        searchableText = searchableText.substring(0, 100000);
      }
    } catch (error) {
      logger.warn('Failed to extract text from document for search:', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't fail the upload if text extraction fails
    }

    // Create document record
    const { data: document, error: docError } = await supabaseServer
      .from('contract_documents')
      .insert({
        contract_id: id,
        version_number: nextVersion,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        is_current: true,
        uploaded_by: userId,
        searchable_text: searchableText,
      })
      .select()
      .single();

    if (docError) {
      // Clean up uploaded file if document creation fails
      await supabaseAdmin.storage
        .from('contract-documents')
        .remove([filePath]);
      
      return handleSupabaseError(docError);
    }

    // Create version record
    const { data: versionRecord, error: versionError } = await supabaseServer
      .from('contract_document_versions')
      .insert({
        document_id: document.id,
        version_number: nextVersion,
        file_url: urlData.publicUrl,
        created_by: userId,
      })
      .select()
      .single();

    if (versionError) {
      logger.error('Version creation error:', versionError);
      // Don't fail the request if version record fails - document upload succeeded
      logger.warn(`Document ${document.id} uploaded but version record creation failed`, { 
        documentId: document.id, 
        versionNumber: nextVersion,
        error: versionError 
      });
    } else {
      logger.info(`Document version created successfully`, { 
        documentId: document.id, 
        versionId: versionRecord?.id,
        versionNumber: nextVersion 
      });
    }

    return successResponse({ document }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to upload document');
  }
}

