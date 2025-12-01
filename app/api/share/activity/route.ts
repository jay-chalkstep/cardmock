import { NextRequest } from 'next/server';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/share/activity
 * Log activity on a public share link (view, download, etc.)
 * Note: This endpoint does NOT require authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shareLinkId, action } = body;

    logger.api('/api/share/activity', 'POST', { shareLinkId, action });

    if (!shareLinkId || !action) {
      return badRequestResponse('shareLinkId and action are required');
    }

    const supabase = createServerAdminClient();

    // Get share link to get asset_id
    const { data: shareLink, error: shareError } = await supabase
      .from('public_share_links')
      .select('id, asset_id')
      .eq('id', shareLinkId)
      .single();

    if (shareError || !shareLink) {
      // Don't expose that the share link doesn't exist
      return successResponse({ logged: false });
    }

    // Log to public_share_analytics
    await supabase.from('public_share_analytics').insert({
      link_id: shareLinkId,
      actions_taken: [action],
      viewer_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
    }).catch(() => {});

    // Also log to cardmock_activity if it's a download
    if (action === 'download' && shareLink.asset_id) {
      await supabase.from('cardmock_activity').insert({
        cardmock_id: shareLink.asset_id,
        action: 'downloaded',
        actor_id: null, // Public download, no authenticated user
        metadata: {
          source: 'public_share',
          share_link_id: shareLinkId,
        },
      }).catch(() => {});
    }

    return successResponse({ logged: true });
  } catch (error) {
    return errorResponse(error, 'Failed to log activity');
  }
}
