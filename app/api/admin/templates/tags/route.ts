import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, forbiddenResponse } from '@/lib/api/response';
import { createServerAdminClient } from '@/lib/supabase/server';
import { getAllSuggestedTags, SUGGESTED_TAGS } from '@/lib/templateTypes';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/templates/tags
 * Get all tags used across templates + suggested tags
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    // Check admin role
    const admin = await isAdmin();
    if (!admin) {
      return forbiddenResponse('Admin access required');
    }

    const supabase = createServerAdminClient();

    // Get all unique tags from templates using a raw query
    // unnest expands the array into rows, then we aggregate unique values
    const { data: tagsResult, error } = await supabase
      .from('templates')
      .select('tags')
      .eq('organization_id', orgId)
      .eq('is_archived', false);

    if (error) {
      return errorResponse(error, 'Failed to fetch tags');
    }

    // Flatten and count tags
    const tagCounts: Record<string, number> = {};
    for (const row of tagsResult || []) {
      for (const tag of row.tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    // Sort by usage count
    const usedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));

    // Get suggested tags (excluding already used ones)
    const usedTagSet = new Set(usedTags.map(t => t.tag));
    const suggestedTags = getAllSuggestedTags().filter(t => !usedTagSet.has(t));

    return successResponse({
      usedTags,
      suggestedTags,
      suggestedCategories: SUGGESTED_TAGS,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch tags');
  }
}
