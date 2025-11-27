import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/templates/[id]
 * Get a single template with usage count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const { id } = await params;
    const supabase = createServerAdminClient();

    logger.api(`/api/templates/${id}`, 'GET', { orgId, templateId: id });

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (templateError) {
      if (templateError.code === 'PGRST116') {
        return notFoundResponse('Template not found');
      }
      return handleSupabaseError(templateError);
    }

    // Get usage count (number of mockups/assets using this template)
    const { count: usageCount, error: countError } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', id)
      .eq('organization_id', orgId);

    if (countError) {
      logger.error('Failed to get usage count', countError);
    }

    logger.info('Template fetched successfully', {
      orgId,
      templateId: id,
      usageCount: usageCount || 0
    });

    return successResponse({
      template,
      usageCount: usageCount || 0
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch template');
  }
}
