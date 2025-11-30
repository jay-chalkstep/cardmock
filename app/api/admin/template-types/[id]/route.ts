import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Guide preset structure for validation
 */
interface GuidePreset {
  position: number;
  label: string;
  color: string;
  orientation: 'vertical' | 'horizontal';
}

/**
 * GET /api/admin/template-types/:id
 * Get a single template type with its guide presets from database
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;

    const admin = await isAdmin();
    if (!admin) {
      return forbiddenResponse('Admin access required');
    }

    const { id } = await params;

    if (!id) {
      return badRequestResponse('Template type ID is required');
    }

    const supabase = createServerAdminClient();

    const { data: templateType, error } = await supabase
      .from('template_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Template type not found');
      }
      return handleSupabaseError(error);
    }

    // Get count of templates using this type
    const { count: templateCount } = await supabase
      .from('templates')
      .select('*', { count: 'exact', head: true })
      .eq('template_type_id', id);

    return successResponse({
      templateType,
      templateCount: templateCount || 0,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch template type');
  }
}

/**
 * PATCH /api/admin/template-types/:id
 * Update a template type's guide presets
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;

    const admin = await isAdmin();
    if (!admin) {
      return forbiddenResponse('Admin access required');
    }

    const { id } = await params;

    if (!id) {
      return badRequestResponse('Template type ID is required');
    }

    const body = await request.json();
    const { guide_presets } = body;

    // Validate guide_presets structure
    if (guide_presets !== undefined) {
      if (typeof guide_presets !== 'object' || guide_presets === null) {
        return badRequestResponse('guide_presets must be an object');
      }

      // Validate each guide preset
      for (const [key, value] of Object.entries(guide_presets)) {
        const preset = value as GuidePreset;

        if (typeof preset.position !== 'number' || preset.position < 0) {
          return badRequestResponse(`Invalid position for guide "${key}": must be a non-negative number`);
        }

        if (typeof preset.label !== 'string' || !preset.label.trim()) {
          return badRequestResponse(`Invalid label for guide "${key}": must be a non-empty string`);
        }

        if (typeof preset.color !== 'string' || !preset.color.match(/^#[0-9A-Fa-f]{6}$/)) {
          return badRequestResponse(`Invalid color for guide "${key}": must be a hex color (e.g., #22d3ee)`);
        }

        if (!['vertical', 'horizontal'].includes(preset.orientation)) {
          return badRequestResponse(`Invalid orientation for guide "${key}": must be "vertical" or "horizontal"`);
        }
      }
    }

    const supabase = createServerAdminClient();

    // First check if template type exists
    const { data: existing, error: fetchError } = await supabase
      .from('template_types')
      .select('id, width, height')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return notFoundResponse('Template type not found');
      }
      return handleSupabaseError(fetchError);
    }

    // Validate guide positions are within template dimensions
    if (guide_presets) {
      for (const [key, value] of Object.entries(guide_presets)) {
        const preset = value as GuidePreset;
        const maxPosition = preset.orientation === 'vertical' ? existing.width : existing.height;

        if (preset.position > maxPosition) {
          return badRequestResponse(
            `Guide "${key}" position (${preset.position}px) exceeds template ${preset.orientation === 'vertical' ? 'width' : 'height'} (${maxPosition}px)`
          );
        }
      }
    }

    // Update the template type
    const { data: updated, error: updateError } = await supabase
      .from('template_types')
      .update({ guide_presets })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    return successResponse({
      templateType: updated,
      message: 'Guide presets updated successfully',
    });
  } catch (error) {
    return errorResponse(error, 'Failed to update template type');
  }
}
