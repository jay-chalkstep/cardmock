import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 *
 * Fetches user's notifications with pagination and filtering
 * Query params:
 * - limit: number of notifications to return (default: 50)
 * - offset: pagination offset (default: 0)
 * - unread_only: boolean to filter only unread (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    logger.api('/api/notifications', 'GET', { orgId, userId, limit, offset, unreadOnly });

    // Build query
    let query = supabaseServer
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by read status if requested
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      return handleSupabaseError(error);
    }

    // Get total count for pagination
    let countQuery = supabaseServer
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', orgId);

    if (unreadOnly) {
      countQuery = countQuery.eq('is_read', false);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      logger.error('Failed to get notification count', countError);
    }

    logger.info('Notifications fetched successfully', {
      userId,
      count: notifications?.length || 0,
      total: count || 0,
    });

    return successResponse({
      notifications: notifications || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch notifications');
  }
}

