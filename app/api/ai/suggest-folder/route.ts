/**
 * AI Folder Suggestion API Endpoint
 * POST /api/ai/suggest-folder
 * Suggests folders for a mockup based on content similarity
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { suggestFoldersForMockup, recordSuggestionFeedback } from '@/lib/ai/folder-suggestions';
import { logAIOperation } from '@/lib/ai/utils';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await req.json();
    const { mockupId } = body;

    logger.api('/api/ai/suggest-folder', 'POST', { orgId, userId, mockupId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['mockupId']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    logAIOperation('Generating folder suggestions', { mockupId, orgId });

    // Verify mockup belongs to user's organization
    const { data: mockup, error: mockupError } = await supabaseServer
      .from('assets')
      .select('organization_id')
      .eq('id', mockupId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    if (mockup.organization_id !== orgId) {
      return forbiddenResponse('Mockup does not belong to your organization');
    }

    // Check if mockup has been analyzed
    const { data: aiMetadata, error: metadataError } = await supabaseServer
      .from('mockup_ai_metadata')
      .select('embedding')
      .eq('asset_id', mockupId)
      .single();

    if (metadataError || !aiMetadata || !aiMetadata.embedding) {
      return badRequestResponse('Mockup has not been analyzed yet. Please analyze it first.');
    }

    // Get folder suggestions
    const suggestions = await suggestFoldersForMockup(mockupId, orgId, userId);

    logger.info('Folder suggestions generated', { mockupId, count: suggestions.length });

    return successResponse({
      mockupId,
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to generate folder suggestions');
  }
}

// PATCH endpoint to record user feedback on suggestions
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await req.json();
    const { suggestionId, accepted } = body;

    logger.api('/api/ai/suggest-folder', 'PATCH', { orgId, userId, suggestionId });

    // Validate required fields
    if (!suggestionId || typeof accepted !== 'boolean') {
      return badRequestResponse('suggestionId and accepted (boolean) are required');
    }

    // Verify suggestion belongs to user
    const { data: suggestion, error: suggestionError } = await supabaseServer
      .from('folder_suggestions')
      .select('user_id')
      .eq('id', suggestionId)
      .single();

    if (suggestionError || !suggestion) {
      return notFoundResponse('Suggestion not found');
    }

    if (suggestion.user_id !== userId) {
      return forbiddenResponse('You can only provide feedback on your own suggestions');
    }

    // Record feedback
    await recordSuggestionFeedback(suggestionId, accepted);

    logger.info('Suggestion feedback recorded', { suggestionId, accepted });

    return successResponse({
      message: 'Feedback recorded successfully',
    });
  } catch (error) {
    return errorResponse(error, 'Failed to record feedback');
  }
}

// GET endpoint to retrieve suggestion history
export async function GET(req: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const { searchParams } = new URL(req.url);
    const mockupId = searchParams.get('mockupId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    logger.api('/api/ai/suggest-folder', 'GET', { orgId, userId, mockupId, limit });

    if (mockupId) {
      // Get suggestions for a specific mockup
      const { data: suggestions, error } = await supabaseServer
        .from('folder_suggestions')
        .select(`
          *,
          folder:folders(id, name)
        `)
        .eq('asset_id', mockupId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return handleSupabaseError(error);
      }

      return successResponse({
        suggestions: suggestions || [],
      });
    } else {
      // Get recent suggestions for the user
      const { data: suggestions, error } = await supabaseServer
        .from('folder_suggestions')
        .select(`
          *,
          folder:folders(id, name),
          mockup:assets!inner(organization_id)
        `)
        .eq('user_id', userId)
        .eq('mockup.organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return handleSupabaseError(error);
      }

      return successResponse({
        suggestions: suggestions || [],
      });
    }
  } catch (error) {
    return errorResponse(error, 'Failed to fetch suggestions');
  }
}
