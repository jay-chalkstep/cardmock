import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { generateComprehensiveContractSummary, extractTextFromWordDocument } from '@/lib/ai/document-diff';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contracts/[id]/summary
 *
 * Generate comprehensive AI summary of a contract from all its documents
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/contracts/${id}/summary`, 'POST', { orgId });

    // Get contract
    const { data: contract, error: contractError } = await supabaseServer
      .from('contracts')
      .select('id, contract_number, title, organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (contractError || !contract) {
      return notFoundResponse('Contract not found');
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY not configured');
      return errorResponse(
        new Error('OpenAI API key not configured'),
        'AI summary generation is not available. Please configure OPENAI_API_KEY to enable this feature.'
      );
    }

    // Get all current documents for this contract
    const { data: documents, error: documentsError } = await supabaseServer
      .from('contract_documents')
      .select('id, file_url, file_name, version_number, is_current')
      .eq('contract_id', id)
      .eq('is_current', true);

    if (documentsError) {
      logger.error('Error fetching documents:', documentsError);
      return errorResponse(
        new Error('Failed to fetch contract documents'),
        'Failed to fetch contract documents for summary generation.'
      );
    }

    if (!documents || documents.length === 0) {
      return errorResponse(
        new Error('No documents found'),
        'No documents found for this contract. Please upload at least one document to generate a summary.'
      );
    }

    // Extract text from all documents
    let documentTexts: string[] = [];
    try {
      const textPromises = documents.map(doc => extractTextFromWordDocument(doc.file_url));
      documentTexts = await Promise.all(textPromises);
    } catch (error) {
      logger.error('Error extracting text from documents:', error);
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to extract text from documents'),
        'Failed to extract text from contract documents. Please ensure the documents are accessible.'
      );
    }

    // Generate comprehensive AI summary
    let summary: string;
    try {
      summary = await generateComprehensiveContractSummary(documentTexts);
    } catch (error) {
      logger.error('Failed to generate AI contract summary:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userMessage = 'Failed to generate contract summary.';
      
      if (errorMessage.includes('API key') || errorMessage.includes('OPENAI')) {
        userMessage = 'OpenAI API key is invalid or not configured. Please check your configuration.';
      } else if (errorMessage.includes('download') || errorMessage.includes('fetch')) {
        userMessage = 'Failed to download document files. Please ensure the documents are accessible.';
      } else if (errorMessage.includes('extract') || errorMessage.includes('mammoth')) {
        userMessage = 'Failed to extract text from documents. The files may be corrupted or in an unsupported format.';
      } else {
        userMessage = 'Failed to generate contract summary. Please try again later.';
      }
      
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to generate contract summary'),
        userMessage
      );
    }

    // Update contract with summary
    const { error: updateError } = await supabaseServer
      .from('contracts')
      .update({
        ai_summary: summary,
        ai_summary_generated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      logger.error('Failed to update contract summary:', updateError);
      // Even if update fails, return the generated summary so user can see it
      return successResponse({ 
        summary,
        generated_at: new Date().toISOString(),
        warning: 'Summary generated but failed to save. It may not persist.'
      });
    }

    return successResponse({ 
      summary,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return errorResponse(error, 'Failed to generate contract summary');
  }
}

