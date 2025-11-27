import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/brands/[id]/mockups
 *
 * Get mockups that use any logo variant from this brand
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = createServerAdminClient();

    logger.api(`/api/brands/${id}/mockups`, 'GET', { orgId, limit });

    // First, get the brand and its logo variants
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, logo_variants!brand_id(id)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (brandError || !brand) {
      return notFoundResponse('Brand not found');
    }

    const logoVariantIds = (brand.logo_variants as any[])?.map(lv => lv.id) || [];

    if (logoVariantIds.length === 0) {
      return successResponse({ mockups: [] });
    }

    // Fetch mockups using any of these logo variants
    const { data: mockups, error: mockupsError } = await supabase
      .from('assets')
      .select('id, mockup_name, mockup_image_url, status, updated_at')
      .in('logo_id', logoVariantIds)
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (mockupsError) {
      return handleSupabaseError(mockupsError);
    }

    return successResponse({ mockups: mockups || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch mockups');
  }
}
