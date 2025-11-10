import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { generateDiffSummaryFromUrls } from '@/lib/ai/document-diff';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contracts/documents/[docId]/diff
 *
 * Generate AI diff summary comparing current version with previous version
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

    logger.api(`/api/contracts/documents/${docId}/diff`, 'POST', { orgId });

    // Get document
    const { data: document } = await supabaseServer
      .from('contract_documents')
      .select('id, version_number, contract_id')
      .eq('id', docId)
      .single();

    if (!document) {
      return notFoundResponse('Document not found');
    }

    // Get current and previous versions
    const { data: versions, error: versionsError } = await supabaseServer
      .from('contract_document_versions')
      .select('*')
      .eq('document_id', docId)
      .order('version_number', { ascending: false })
      .limit(2);

    if (versionsError) {
      logger.error('Failed to fetch versions:', versionsError);
      return errorResponse(versionsError, 'Failed to fetch document versions');
    }

    if (!versions || versions.length < 2) {
      return successResponse({ 
        message: 'No previous version to compare',
        diff_summary: null,
        error: null
      });
    }

    const currentVersion = versions[0];
    const previousVersion = versions[1];

    // Check if diff already exists
    if (currentVersion.diff_summary) {
      return successResponse({ 
        diff_summary: currentVersion.diff_summary,
        generated_at: currentVersion.diff_summary_generated_at,
        cached: true
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OPENAI_API_KEY not configured');
      return errorResponse(
        new Error('OpenAI API key not configured'),
        'AI diff generation is not available. Please configure OPENAI_API_KEY to enable this feature.'
      );
    }

    // Generate AI diff summary
    let diffSummary: string;
    try {
      diffSummary = await generateDiffSummaryFromUrls(
        previousVersion.file_url,
        currentVersion.file_url
      );
    } catch (error) {
      logger.error('Failed to generate AI diff summary:', error);
      
      // Determine error type for better user messaging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userMessage = 'Failed to generate AI diff summary.';
      
      if (errorMessage.includes('API key') || errorMessage.includes('OPENAI')) {
        userMessage = 'OpenAI API key is invalid or not configured. Please check your configuration.';
      } else if (errorMessage.includes('download') || errorMessage.includes('fetch')) {
        userMessage = 'Failed to download document files. Please ensure the documents are accessible.';
      } else if (errorMessage.includes('extract') || errorMessage.includes('mammoth')) {
        userMessage = 'Failed to extract text from documents. The files may be corrupted or in an unsupported format.';
      } else {
        userMessage = 'Failed to generate diff summary. Please try again later.';
      }
      
      // Return error but don't fail the request - user can retry
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to generate diff summary'),
        userMessage
      );
    }

    // Update version with diff summary
    const { error: updateError } = await supabaseServer
      .from('contract_document_versions')
      .update({
        diff_summary: diffSummary,
        diff_summary_generated_at: new Date().toISOString(),
      })
      .eq('id', currentVersion.id);

    if (updateError) {
      logger.error('Failed to update diff summary:', updateError);
      // Even if update fails, return the generated summary so user can see it
      return successResponse({ 
        diff_summary: diffSummary,
        generated_at: new Date().toISOString(),
        warning: 'Summary generated but failed to save. It may not persist.'
      });
    }

    return successResponse({ 
      diff_summary: diffSummary,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return errorResponse(error, 'Failed to generate diff summary');
  }
}

