import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { generateDiffSummaryFromUrls } from '@/lib/ai/document-diff';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contracts/documents/[docId]/versions/[versionId]/diff
 *
 * Generate AI diff summary comparing a specific version with its previous version
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ docId: string; versionId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { docId, versionId } = await context.params;

    logger.api(`/api/contracts/documents/${docId}/versions/${versionId}/diff`, 'POST', { orgId });

    // Get the specific version
    const { data: currentVersion, error: versionError } = await supabaseServer
      .from('contract_document_versions')
      .select('*')
      .eq('id', versionId)
      .eq('document_id', docId)
      .single();

    if (versionError || !currentVersion) {
      return notFoundResponse('Version not found');
    }

    // Check if diff already exists
    if (currentVersion.diff_summary) {
      return successResponse({ 
        diff_summary: currentVersion.diff_summary,
        generated_at: currentVersion.diff_summary_generated_at,
        cached: true
      });
    }

    // Only generate diff if version > 1
    if (currentVersion.version_number <= 1) {
      return successResponse({ 
        message: 'No previous version to compare',
        diff_summary: null,
        error: null
      });
    }

    // Get the previous version
    const { data: previousVersion, error: prevError } = await supabaseServer
      .from('contract_document_versions')
      .select('*')
      .eq('document_id', docId)
      .eq('version_number', currentVersion.version_number - 1)
      .single();

    if (prevError || !previousVersion) {
      return successResponse({ 
        message: 'Previous version not found',
        diff_summary: null,
        error: null
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

