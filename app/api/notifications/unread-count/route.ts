import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/unread-count
 *
 * Returns the count of unread notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

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

    const unreadCount = count || 0;

    logger.info('Unread count fetched successfully', { userId, unreadCount });

    return successResponse({ count: unreadCount });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch unread count');
  }
}

