import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse,
} from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { GUIDE_COLORS, type Guide } from '@/lib/guidePresets';

export const dynamic = 'force-dynamic';

/**
 * Guide preset as stored in database
 */
interface DbGuidePreset {
  position: number;
  label: string;
  color: string;
  orientation: 'vertical' | 'horizontal';
}

/**
 * Legacy format (simple key: value number pairs)
 */
type LegacyGuidePresets = Record<string, number>;

/**
 * New format with full guide metadata
 */
type NewGuidePresets = Record<string, DbGuidePreset>;

/**
 * Convert database guide presets to the Guide[] format used by the designer
 */
function convertToGuides(
  presets: LegacyGuidePresets | NewGuidePresets | null,
  templateWidth: number,
  templateHeight: number
): { vertical: Guide[]; horizontal: Guide[] } {
  if (!presets) {
    return { vertical: [], horizontal: [] };
  }

  const vertical: Guide[] = [];
  const horizontal: Guide[] = [];

  for (const [key, value] of Object.entries(presets)) {
    if (typeof value === 'number') {
      // Legacy format - infer orientation from key name
      const isHorizontal =
        key.toLowerCase().includes('top') ||
        key.toLowerCase().includes('bottom');

      const guide: Guide = {
        id: `preset-${key}`,
        position: value,
        label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        isPreset: true,
        color: key.toLowerCase().includes('midpoint') ? GUIDE_COLORS.midpoint : GUIDE_COLORS.preset,
      };

      if (isHorizontal) {
        horizontal.push(guide);
      } else {
        vertical.push(guide);
      }
    } else if (typeof value === 'object' && value !== null) {
      // New format with full metadata
      const preset = value as DbGuidePreset;
      const guide: Guide = {
        id: `preset-${key}`,
        position: preset.position,
        label: preset.label,
        isPreset: true,
        color: preset.color,
      };

      if (preset.orientation === 'horizontal') {
        horizontal.push(guide);
      } else {
        vertical.push(guide);
      }
    }
  }

  return { vertical, horizontal };
}

/**
 * GET /api/template-types/:id/guides
 * Get guide presets for a template type, converted to Guide[] format
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;

    const { id } = await params;

    if (!id) {
      return badRequestResponse('Template type ID is required');
    }

    const supabase = createServerAdminClient();

    const { data: templateType, error } = await supabase
      .from('template_types')
      .select('id, name, width, height, guide_presets')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Template type not found');
      }
      return handleSupabaseError(error);
    }

    // Convert to Guide[] format
    const guides = convertToGuides(
      templateType.guide_presets,
      templateType.width,
      templateType.height
    );

    return successResponse({
      templateType: {
        id: templateType.id,
        name: templateType.name,
        width: templateType.width,
        height: templateType.height,
      },
      guides,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch guide presets');
  }
}
