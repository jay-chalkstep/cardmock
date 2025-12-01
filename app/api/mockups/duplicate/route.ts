import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mockups/duplicate
 * Duplicate a CardMock
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const supabase = createServerAdminClient();
    const body = await request.json();
    const { mockupId, newName, brandId } = body;

    logger.api('/api/mockups/duplicate', 'POST', { orgId, userId, mockupId });

    if (!mockupId) {
      return badRequestResponse('mockupId is required');
    }

    if (!newName || !newName.trim()) {
      return badRequestResponse('newName is required');
    }

    // Fetch the original mockup
    const { data: original, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', mockupId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !original) {
      return notFoundResponse('Mockup not found');
    }

    // Create the duplicate
    const duplicateData = {
      mockup_name: newName.trim(),
      logo_id: original.logo_id,
      template_id: original.template_id,
      organization_id: orgId,
      created_by: userId,
      folder_id: original.folder_id,
      project_id: null, // New duplicates start without a project
      logo_x: original.logo_x,
      logo_y: original.logo_y,
      logo_scale: original.logo_scale,
      mockup_image_url: original.mockup_image_url, // Share the same image initially
      status: 'draft', // Reset status to draft
    };

    // If a different brand was selected, update the logo_id
    // Note: This would require finding a logo for the new brand
    // For now, we keep the same logo

    const { data: duplicate, error: insertError } = await supabase
      .from('assets')
      .insert(duplicateData)
      .select()
      .single();

    if (insertError) {
      return handleSupabaseError(insertError);
    }

    logger.info('Mockup duplicated successfully', {
      originalId: mockupId,
      duplicateId: duplicate.id,
      newName: newName.trim(),
    });

    // Log activity on original (fire and forget, don't block response)
    supabase.from('cardmock_activity').insert({
      cardmock_id: mockupId,
      action: 'duplicated',
      actor_id: userId,
      metadata: {
        duplicate_id: duplicate.id,
        new_name: newName.trim(),
      },
    }).then(() => {}, () => {});

    // Log activity on duplicate (fire and forget, don't block response)
    supabase.from('cardmock_activity').insert({
      cardmock_id: duplicate.id,
      action: 'created',
      actor_id: userId,
      metadata: {
        duplicated_from: mockupId,
      },
    }).then(() => {}, () => {});

    return successResponse({ mockup: duplicate }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to duplicate mockup');
  }
}
