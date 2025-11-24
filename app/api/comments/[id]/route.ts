import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/comments/[id]
 *
 * Update a comment (edit comment text)
 *
 * Body:
 * {
 *   comment_text: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id: commentId } = await context.params;

    const body = await request.json();
    const { comment_text, annotation_data, position_x, position_y } = body;

    logger.api(`/api/comments/${commentId}`, 'PATCH', { orgId, userId });

    // Require at least one field to update
    if (!comment_text && !annotation_data && position_x === undefined && position_y === undefined) {
      return badRequestResponse('At least one field to update is required');
    }

    // Get the comment to verify ownership
    const { data: comment, error: fetchError } = await supabaseServer
      .from('mockup_comments')
      .select('*')
      .eq('id', commentId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !comment) {
      return notFoundResponse('Comment not found');
    }

    // Verify user owns this comment
    if (comment.user_id !== userId) {
      return forbiddenResponse('You can only edit your own comments');
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Handle annotation/position updates (no edit history needed)
    if (annotation_data !== undefined) {
      updateData.annotation_data = annotation_data;
    }
    if (position_x !== undefined) {
      updateData.position_x = position_x;
    }
    if (position_y !== undefined) {
      updateData.position_y = position_y;
    }

    // Handle comment text updates (with edit history)
    if (comment_text) {
      if (comment_text.trim().length === 0) {
        return badRequestResponse('comment_text cannot be empty');
      }

      // Get user details from Clerk (dynamic import to avoid Edge Runtime issues)
      const { clerkClient } = await import('@clerk/nextjs/server');
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';

      // Build edit history entry
      const editHistory = comment.edit_history || [];
      editHistory.push({
        edited_at: new Date().toISOString(),
        edited_by: userId,
        edited_by_name: fullName,
        old_text: comment.comment_text,
        new_text: comment_text.trim()
      });

      updateData.comment_text = comment_text.trim();
      updateData.edit_history = editHistory;
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabaseServer
      .from('mockup_comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Comment updated successfully', { commentId });

    return successResponse({ comment: updatedComment });
  } catch (error) {
    return errorResponse(error, 'Failed to update comment');
  }
}

/**
 * DELETE /api/comments/[id]
 *
 * Delete a comment
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id: commentId } = await context.params;

    logger.api(`/api/comments/${commentId}`, 'DELETE', { orgId, userId });

    // Get the comment to verify ownership
    const { data: comment, error: fetchError } = await supabaseServer
      .from('mockup_comments')
      .select('*')
      .eq('id', commentId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !comment) {
      return notFoundResponse('Comment not found');
    }

    // Verify user owns this comment
    if (comment.user_id !== userId) {
      return forbiddenResponse('You can only delete your own comments');
    }

    // Get user details from Clerk (dynamic import to avoid Edge Runtime issues)
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';

    // Soft delete comment (preserve for audit trail)
    const { error: deleteError } = await supabaseServer
      .from('mockup_comments')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        deleted_by_name: fullName
      })
      .eq('id', commentId);

    if (deleteError) {
      return handleSupabaseError(deleteError);
    }

    logger.info('Comment deleted successfully', { commentId });

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to delete comment');
  }
}
