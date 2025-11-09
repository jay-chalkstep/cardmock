import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { createServerAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/[id]/documents/[docId]/versions
 *
 * Get all versions of a document
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id, docId } = await context.params;

    logger.api(`/api/contracts/${id}/documents/${docId}/versions`, 'GET', { orgId });

    // Check if contract and document exist
    const { data: document } = await supabaseServer
      .from('contract_documents')
      .select('id, contract_id')
      .eq('id', docId)
      .eq('contract_id', id)
      .single();

    if (!document) {
      return notFoundResponse('Document not found');
    }

    // Get versions
    const { data: versions, error } = await supabaseServer
      .from('contract_document_versions')
      .select('*')
      .eq('document_id', docId)
      .order('version_number', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ versions: versions || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch versions');
  }
}

/**
 * POST /api/contracts/[id]/documents/[docId]/versions
 *
 * Create a new version of a document
 *
 * Body: FormData with file
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id, docId } = await context.params;

    logger.api(`/api/contracts/${id}/documents/${docId}/versions`, 'POST', { orgId, userId });

    // Check if document exists
    const { data: document } = await supabaseServer
      .from('contract_documents')
      .select('id, contract_id, version_number')
      .eq('id', docId)
      .eq('contract_id', id)
      .single();

    if (!document) {
      return notFoundResponse('Document not found');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return badRequestResponse('File is required');
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];

    if (!allowedTypes.includes(file.type)) {
      return badRequestResponse('Only Word documents (.docx, .doc) are allowed');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return badRequestResponse('File size must be less than 10MB');
    }

    const nextVersion = document.version_number + 1;

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

    // Mark previous document as not current
    await supabaseServer
      .from('contract_documents')
      .update({ is_current: false })
      .eq('id', docId);

    // Update document to new version
    const { data: updatedDoc, error: docError } = await supabaseServer
      .from('contract_documents')
      .update({
        version_number: nextVersion,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        is_current: true,
      })
      .eq('id', docId)
      .select()
      .single();

    if (docError) {
      await supabaseAdmin.storage
        .from('contract-documents')
        .remove([filePath]);
      
      return handleSupabaseError(docError);
    }

    // Create version record
    const { data: version, error: versionError } = await supabaseServer
      .from('contract_document_versions')
      .insert({
        document_id: docId,
        version_number: nextVersion,
        file_url: urlData.publicUrl,
        created_by: userId,
      })
      .select()
      .single();

    if (versionError) {
      logger.error('Version creation error:', versionError);
      // Don't fail the request if version record fails
    }

    return successResponse({ document: updatedDoc, version }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create version');
  }
}

