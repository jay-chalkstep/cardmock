import { NextRequest } from 'next/server';
import { getUserAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/unread-count
 *
 * Returns the count of unread notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await getUserAuthContext();

    // If user is not in an org, return 0 notifications
    if (!orgId) {
      return successResponse({ count: 0 });
    }

    logger.api('/api/notifications/unread-count', 'GET', { orgId, userId });

    const { count, error } = await supabaseServer
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .eq('is_read', false);

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ count: count || 0 });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch unread count');
  }
}

