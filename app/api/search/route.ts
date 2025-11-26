import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

interface SearchResult {
  id: string;
  type: 'brand' | 'template' | 'asset';
  title: string;
  subtitle?: string;
  url: string;
}

/**
 * GET /api/search
 * Unified search across brands, templates, and assets
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    logger.api('/api/search', 'GET', { orgId, userId, query });

    if (!query || query.length < 2) {
      return successResponse({ results: [] });
    }

    const supabase = createServerAdminClient();
    const searchTerm = `%${query.toLowerCase()}%`;
    const results: SearchResult[] = [];

    // Search brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, company_name, domain')
      .eq('organization_id', orgId)
      .or(`company_name.ilike.${searchTerm},domain.ilike.${searchTerm}`)
      .limit(5);

    if (!brandsError && brands) {
      brands.forEach((brand) => {
        results.push({
          id: brand.id,
          type: 'brand',
          title: brand.company_name,
          subtitle: brand.domain,
          url: `/brands/${brand.id}`,
        });
      });
    }

    // Search templates
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select('id, template_name, name')
      .eq('organization_id', orgId)
      .or(`template_name.ilike.${searchTerm},name.ilike.${searchTerm}`)
      .limit(5);

    if (!templatesError && templates) {
      templates.forEach((template: any) => {
        results.push({
          id: template.id,
          type: 'template',
          title: template.template_name || template.name || 'Unnamed Template',
          url: `/templates`,
        });
      });
    }

    // Search assets (CardMocks)
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, name, mockup_name, searchable_text')
      .eq('organization_id', orgId)
      .or(`name.ilike.${searchTerm},mockup_name.ilike.${searchTerm},searchable_text.ilike.${searchTerm}`)
      .limit(5);

    if (!assetsError && assets) {
      assets.forEach((asset: any) => {
        results.push({
          id: asset.id,
          type: 'asset',
          title: asset.mockup_name || asset.name || 'Unnamed CardMock',
          url: `/mockups/${asset.id}`,
        });
      });
    }

    // Sort results by type priority (brands, assets, templates)
    const typeOrder = { brand: 0, asset: 1, template: 2 };
    results.sort((a, b) => {
      const orderDiff = typeOrder[a.type] - typeOrder[b.type];
      if (orderDiff !== 0) return orderDiff;
      return a.title.localeCompare(b.title);
    });

    return successResponse({ results: results.slice(0, 10) });
  } catch (error) {
    logger.error('Search error', error);
    return errorResponse(error, 'Failed to perform search');
  }
}
