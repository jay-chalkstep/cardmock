import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { extractTextFromWordDocument } from '@/lib/ai/document-diff';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contracts/documents/[docId]/extract-text
 *
 * Extract and store text content from an existing document for search
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ docId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { docId } = await context.params;

    logger.api(`/api/contracts/documents/${docId}/extract-text`, 'POST', { orgId });

    // Get document
    const { data: document, error: docError } = await supabaseServer
      .from('contract_documents')
      .select('id, file_url, file_name, contract_id')
      .eq('id', docId)
      .single();

    if (docError || !document) {
      return notFoundResponse('Document not found');
    }

    // Verify contract belongs to organization
    const { data: contract } = await supabaseServer
      .from('contracts')
      .select('id, organization_id')
      .eq('id', document.contract_id)
      .eq('organization_id', orgId)
      .single();

    if (!contract) {
      return notFoundResponse('Contract not found');
    }

    // Extract text from document
    let searchableText: string | null = null;
    try {
      searchableText = await extractTextFromWordDocument(document.file_url);
      // Limit text length to prevent database issues (keep first 100k characters)
      if (searchableText && searchableText.length > 100000) {
        searchableText = searchableText.substring(0, 100000);
      }
    } catch (error) {
      logger.warn('Failed to extract text from document:', {
        error: error instanceof Error ? error.message : String(error),
        documentId: docId,
      });
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to extract text'),
        'Failed to extract text from document. Please ensure the document is accessible.'
      );
    }

    // Update document with extracted text
    const { error: updateError } = await supabaseServer
      .from('contract_documents')
      .update({
        searchable_text: searchableText,
      })
      .eq('id', docId);

    if (updateError) {
      logger.error('Failed to update document with searchable text:', updateError);
      return errorResponse(
        updateError,
        'Failed to save extracted text to database.'
      );
    }

    return successResponse({ 
      success: true,
      textLength: searchableText?.length || 0,
      message: 'Text extracted and stored successfully'
    });
  } catch (error) {
    return errorResponse(error, 'Failed to extract text from document');
  }
}

