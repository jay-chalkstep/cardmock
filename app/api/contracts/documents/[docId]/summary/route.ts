import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { generateDocumentSummaryFromUrl } from '@/lib/ai/document-diff';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contracts/documents/[docId]/summary
 *
 * Generate AI summary of a document
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

    logger.api(`/api/contracts/documents/${docId}/summary`, 'POST', { orgId });

    // Get document
    const { data: document, error: docError } = await supabaseServer
      .from('contract_documents')
      .select('id, file_url, file_name, version_number')
      .eq('id', docId)
      .single();

    if (docError || !document) {
      return notFoundResponse('Document not found');
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY not configured');
      return errorResponse(
        new Error('OpenAI API key not configured'),
        'AI summary generation is not available. Please configure OPENAI_API_KEY to enable this feature.'
      );
    }

    // Generate AI document summary
    let summary: string;
    try {
      summary = await generateDocumentSummaryFromUrl(document.file_url);
    } catch (error) {
      logger.error('Failed to generate AI document summary:', error);
      
      // Determine error type for better user messaging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userMessage = 'Failed to generate document summary.';
      
      if (errorMessage.includes('API key') || errorMessage.includes('OPENAI')) {
        userMessage = 'OpenAI API key is invalid or not configured. Please check your configuration.';
      } else if (errorMessage.includes('download') || errorMessage.includes('fetch')) {
        userMessage = 'Failed to download document file. Please ensure the document is accessible.';
      } else if (errorMessage.includes('extract') || errorMessage.includes('mammoth')) {
        userMessage = 'Failed to extract text from document. The file may be corrupted or in an unsupported format.';
      } else {
        userMessage = 'Failed to generate document summary. Please try again later.';
      }
      
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to generate document summary'),
        userMessage
      );
    }

    return successResponse({ 
      summary,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return errorResponse(error, 'Failed to generate document summary');
  }
}

