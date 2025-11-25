import { NextRequest } from 'next/server';
import { getAuthContext, getMockUserInfo } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * POST /api/comments/[id]/resolve
 *
 * Mark a comment as resolved with a resolution note
 *
 * Body:
 * {
 *   resolution_note?: string (optional explanation)
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id: commentId } = await context.params;

    const body = await request.json();
    const { resolution_note } = body;

    logger.api(`/api/comments/${commentId}/resolve`, 'POST', { orgId, userId });

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

    // Check if already resolved
    if (comment.is_resolved) {
      return badRequestResponse('Comment is already resolved');
    }

    // Get user details from mock auth
    const userInfo = getMockUserInfo(userId);
    const fullName = userInfo.name;

    // Resolve the comment
    const { data: resolvedComment, error: updateError} = await supabaseServer
      .from('mockup_comments')
      .update({
        is_resolved: true,
        resolved_by: userId,
        resolved_by_name: fullName,
        resolved_at: new Date().toISOString(),
        resolution_note: resolution_note || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Comment resolved successfully', { commentId });

    return successResponse({ comment: resolvedComment });
  } catch (error) {
    return errorResponse(error, 'Failed to resolve comment');
  }
}
