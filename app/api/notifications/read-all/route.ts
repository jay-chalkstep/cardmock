import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/read-all
 *
 * Marks all unread notifications as read for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    logger.api('/api/notifications/read-all', 'POST', { orgId, userId });

    const { data, error } = await supabaseServer
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .eq('is_read', false)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    const updatedCount = data?.length || 0;

    logger.info('All notifications marked as read', {
      userId,
      updatedCount,
    });

    return successResponse({
      updated_count: updatedCount,
      notifications: data || [],
    });
  } catch (error) {
    return errorResponse(error, 'Failed to mark all notifications as read');
  }
}

