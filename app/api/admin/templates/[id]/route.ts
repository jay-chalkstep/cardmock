import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, forbiddenResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/templates/:id
 * Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    // Check admin role
    const admin = await isAdmin();
    if (!admin) {
      return forbiddenResponse('Admin access required');
    }

    const { id } = await params;

    if (!id) {
      return badRequestResponse('Template ID is required');
    }

    const supabase = createServerAdminClient();

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Template not found');
      }
      return handleSupabaseError(error);
    }

    // Get usage count
    const { count: usageCount } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', id);

    return successResponse({
      template,
      usageCount: usageCount || 0,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch template');
  }
}
