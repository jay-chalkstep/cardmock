import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * POST /api/comments/[id]/unresolve
 *
 * Mark a resolved comment as unresolved
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id: commentId } = await context.params;

    logger.api(`/api/comments/${commentId}/unresolve`, 'POST', { orgId });

    // Get the comment to verify it exists and user has permission
    const { data: comment, error: fetchError } = await supabaseServer
      .from('mockup_comments')
      .select('*')
      .eq('id', commentId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !comment) {
      return notFoundResponse('Comment not found');
    }

    // Check if not resolved
    if (!comment.is_resolved) {
      return badRequestResponse('Comment is not resolved');
    }

    // Unresolve the comment (clear resolution fields)
    const { data: unresolvedComment, error: updateError } = await supabaseServer
      .from('mockup_comments')
      .update({
        is_resolved: false,
        resolved_by: null,
        resolved_by_name: null,
        resolved_at: null,
        resolution_note: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Comment unresolved successfully', { commentId });

    return successResponse({ comment: unresolvedComment });
  } catch (error) {
    return errorResponse(error, 'Failed to unresolve comment');
  }
}
