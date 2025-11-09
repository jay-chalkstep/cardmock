import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/templates
 *
 * Get all card templates for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const supabase = createServerAdminClient();

    logger.api('/api/templates', 'GET', { orgId });

    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .eq('organization_id', orgId)
      .order('template_name');

    if (error) {
      return handleSupabaseError(error);
    }

    logger.info('Templates fetched successfully', { orgId, count: templates?.length || 0 });

    return successResponse({ templates: templates || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch templates');
  }
}
