import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/template-types
 * Get all available template types from database (includes editable guide_presets)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;

    const supabase = createServerAdminClient();

    // Fetch template types from database (source of truth for guide_presets)
    const { data: templateTypes, error } = await supabase
      .from('template_types')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return handleSupabaseError(error);
    }

    // Get template counts for each type
    const { data: counts } = await supabase
      .from('templates')
      .select('template_type_id')
      .eq('is_archived', false);

    const countMap = (counts || []).reduce((acc, t) => {
      acc[t.template_type_id] = (acc[t.template_type_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Enrich with template counts
    const enrichedTypes = templateTypes.map(type => ({
      ...type,
      templateCount: countMap[type.id] || 0,
    }));

    return successResponse({
      templateTypes: enrichedTypes,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch template types');
  }
}
