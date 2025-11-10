import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { generateComprehensiveChangelog } from '@/lib/ai/document-diff';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contracts/[id]/changelog
 *
 * Generate comprehensive AI changelog from all version-to-version changes
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

    logger.api(`/api/contracts/${id}/changelog`, 'POST', { orgId });

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
        'AI changelog generation is not available. Please configure OPENAI_API_KEY to enable this feature.'
      );
    }

    // Get all documents for this contract
    const { data: documents, error: documentsError } = await supabaseServer
      .from('contract_documents')
      .select('id, file_name')
      .eq('contract_id', id);

    if (documentsError) {
      logger.error('Error fetching documents:', documentsError);
      return errorResponse(
        new Error('Failed to fetch contract documents'),
        'Failed to fetch contract documents for changelog generation.'
      );
    }

    if (!documents || documents.length === 0) {
      return errorResponse(
        new Error('No documents found'),
        'No documents found for this contract. Please upload at least one document to generate a changelog.'
      );
    }

    // Get all versions with diff summaries for all documents
    const documentIds = documents.map(doc => doc.id);
    const { data: versions, error: versionsError } = await supabaseServer
      .from('contract_document_versions')
      .select('id, document_id, version_number, diff_summary, created_at')
      .in('document_id', documentIds)
      .order('version_number', { ascending: true });

    if (versionsError) {
      logger.error('Error fetching versions:', versionsError);
      return errorResponse(
        new Error('Failed to fetch document versions'),
        'Failed to fetch document versions for changelog generation.'
      );
    }

    if (!versions || versions.length === 0) {
      return errorResponse(
        new Error('No versions found'),
        'No document versions found. Please upload at least one document version to generate a changelog.'
      );
    }

    // Filter to only versions with diff summaries (version > 1)
    const versionsWithSummaries = versions
      .filter(v => v.version_number > 1 && v.diff_summary)
      .map(v => ({
        versionNumber: v.version_number,
        summary: v.diff_summary || '',
        createdAt: v.created_at,
      }));

    if (versionsWithSummaries.length === 0) {
      return errorResponse(
        new Error('No version changes found'),
        'No version changes found. Please ensure documents have multiple versions with change summaries.'
      );
    }

    // Generate comprehensive AI changelog
    let changelog: string;
    try {
      changelog = await generateComprehensiveChangelog(versionsWithSummaries);
    } catch (error) {
      logger.error('Failed to generate AI changelog:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userMessage = 'Failed to generate changelog.';
      
      if (errorMessage.includes('API key') || errorMessage.includes('OPENAI')) {
        userMessage = 'OpenAI API key is invalid or not configured. Please check your configuration.';
      } else {
        userMessage = 'Failed to generate changelog. Please try again later.';
      }
      
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to generate changelog'),
        userMessage
      );
    }

    // Update contract with changelog
    const { error: updateError } = await supabaseServer
      .from('contracts')
      .update({
        ai_changelog: changelog,
        ai_changelog_generated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      logger.error('Failed to update contract changelog:', updateError);
      // Even if update fails, return the generated changelog so user can see it
      return successResponse({ 
        changelog,
        generated_at: new Date().toISOString(),
        warning: 'Changelog generated but failed to save. It may not persist.'
      });
    }

    return successResponse({ 
      changelog,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return errorResponse(error, 'Failed to generate changelog');
  }
}

