import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mockups/[id]/activity
 * Get activity history for a CardMock
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const { id } = await context.params;
    const supabase = createServerAdminClient();

    logger.api(`/api/mockups/${id}/activity`, 'GET', { orgId });

    // Verify mockup exists and belongs to org
    const { data: mockup, error: mockupError } = await supabase
      .from('assets')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    // Fetch activity with actor details
    const { data: activities, error: activityError } = await supabase
      .from('cardmock_activity')
      .select(`
        id,
        action,
        actor_id,
        metadata,
        created_at
      `)
      .eq('cardmock_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activityError) {
      return handleSupabaseError(activityError);
    }

    // Get actor details for all activities
    const actorIds = [...new Set(activities?.map((a) => a.actor_id).filter(Boolean) || [])];
    let actorMap: Record<string, { name: string; avatar?: string }> = {};

    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('org_memberships')
        .select('user_id, user_name, user_image_url')
        .in('user_id', actorIds);

      if (actors) {
        actorMap = actors.reduce((acc, actor) => {
          acc[actor.user_id] = {
            name: actor.user_name,
            avatar: actor.user_image_url,
          };
          return acc;
        }, {} as Record<string, { name: string; avatar?: string }>);
      }
    }

    // Enrich activities with actor details
    const enrichedActivities = (activities || []).map((activity) => ({
      ...activity,
      actor_name: activity.actor_id ? actorMap[activity.actor_id]?.name : null,
      actor_avatar: activity.actor_id ? actorMap[activity.actor_id]?.avatar : null,
    }));

    return successResponse({ activities: enrichedActivities });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch activity');
  }
}

/**
 * POST /api/mockups/[id]/activity
 * Log a new activity for a CardMock
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const { id } = await context.params;
    const supabase = createServerAdminClient();
    const body = await request.json();
    const { action, metadata } = body;

    logger.api(`/api/mockups/${id}/activity`, 'POST', { orgId, action });

    // Verify mockup exists and belongs to org
    const { data: mockup, error: mockupError } = await supabase
      .from('assets')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    // Insert activity
    const { data: activity, error: insertError } = await supabase
      .from('cardmock_activity')
      .insert({
        cardmock_id: id,
        action,
        actor_id: userId,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      return handleSupabaseError(insertError);
    }

    return successResponse({ activity }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to log activity');
  }
}
