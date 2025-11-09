import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/user/preferences
 *
 * Fetches user preferences, creating default if they don't exist
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    logger.api('/api/user/preferences', 'GET', { orgId, userId });

    // Try to fetch existing preferences
    let { data: preferences, error } = await supabaseServer
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    // If not found, create default preferences
    if (error || !preferences) {
      const defaultPreferences = {
        user_id: userId,
        organization_id: orgId,
        notification_preferences: {
          email_approval_request: true,
          email_approval_received: true,
          email_comment: true,
          email_stage_progress: true,
          email_final_approval: true,
          email_changes_requested: true,
          in_app_approval_request: true,
          in_app_approval_received: true,
          in_app_comment: true,
          in_app_stage_progress: true,
          in_app_final_approval: true,
          in_app_changes_requested: true,
        },
        theme: 'light',
        layout_preferences: {},
      };

      const { data: newPreferences, error: createError } = await supabaseServer
        .from('user_preferences')
        .insert(defaultPreferences)
        .select()
        .single();

      if (createError) {
        return handleSupabaseError(createError);
      }

      preferences = newPreferences;
    }

    logger.info('User preferences fetched successfully', { userId });

    return successResponse({ preferences });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch user preferences');
  }
}

/**
 * POST /api/user/preferences
 *
 * Updates user preferences
 * Body: {
 *   notification_preferences?: object,
 *   theme?: string,
 *   layout_preferences?: object
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    logger.api('/api/user/preferences', 'POST', { orgId, userId });

    const body = await request.json();
    const { notification_preferences, theme, layout_preferences } = body;

    // Build update object
    const updateData: any = {};
    if (notification_preferences !== undefined) {
      updateData.notification_preferences = notification_preferences;
    }
    if (theme !== undefined) {
      updateData.theme = theme;
    }
    if (layout_preferences !== undefined) {
      updateData.layout_preferences = layout_preferences;
    }

    // Check if preferences exist
    const { data: existing } = await supabaseServer
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    let preferences;

    if (existing) {
      // Update existing preferences
      const { data: updated, error: updateError } = await supabaseServer
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (updateError) {
        return handleSupabaseError(updateError);
      }

      preferences = updated;
    } else {
      // Create new preferences with defaults
      const defaultPreferences = {
        user_id: userId,
        organization_id: orgId,
        notification_preferences: notification_preferences || {
          email_approval_request: true,
          email_approval_received: true,
          email_comment: true,
          email_stage_progress: true,
          email_final_approval: true,
          email_changes_requested: true,
          in_app_approval_request: true,
          in_app_approval_received: true,
          in_app_comment: true,
          in_app_stage_progress: true,
          in_app_final_approval: true,
          in_app_changes_requested: true,
        },
        theme: theme || 'light',
        layout_preferences: layout_preferences || {},
        ...updateData,
      };

      const { data: created, error: createError } = await supabaseServer
        .from('user_preferences')
        .insert(defaultPreferences)
        .select()
        .single();

      if (createError) {
        return handleSupabaseError(createError);
      }

      preferences = created;
    }

    logger.info('User preferences updated successfully', { userId });

    return successResponse({ preferences });
  } catch (error) {
    return errorResponse(error, 'Failed to update user preferences');
  }
}

