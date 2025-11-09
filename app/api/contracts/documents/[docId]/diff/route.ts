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
    const { data: versions } = await supabaseServer
      .from('contract_document_versions')
      .select('*')
      .eq('document_id', docId)
      .order('version_number', { ascending: false })
      .limit(2);

    if (!versions || versions.length < 2) {
      return successResponse({ 
        message: 'No previous version to compare',
        diff_summary: null 
      });
    }

    const currentVersion = versions[0];
    const previousVersion = versions[1];

    // Check if diff already exists
    if (currentVersion.diff_summary) {
      return successResponse({ 
        diff_summary: currentVersion.diff_summary,
        generated_at: currentVersion.diff_summary_generated_at 
      });
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
      
      // Return error but don't fail the request
      // The user can retry later
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to generate diff summary'),
        'Failed to generate AI diff summary. Please ensure OPENAI_API_KEY is configured and try again.'
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
      return errorResponse(updateError, 'Failed to save diff summary');
    }

    return successResponse({ 
      diff_summary: diffSummary,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return errorResponse(error, 'Failed to generate diff summary');
  }
}

