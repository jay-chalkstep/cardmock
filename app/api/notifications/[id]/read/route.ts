import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/[id]/read
 *
 * Marks a notification as read
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const { id: notificationId } = await context.params;

    logger.api(`/api/notifications/${notificationId}/read`, 'POST', { orgId, userId });

    // Verify notification exists and belongs to user
    const { data: notification, error: fetchError } = await supabaseServer
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !notification) {
      return notFoundResponse('Notification not found');
    }

    // If already read, return success
    if (notification.is_read) {
      return successResponse({ notification });
    }

    // Mark as read
    const { data: updatedNotification, error: updateError } = await supabaseServer
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Notification marked as read', {
      userId,
      notificationId,
    });

    return successResponse({ notification: updatedNotification });
  } catch (error) {
    return errorResponse(error, 'Failed to mark notification as read');
  }
}

