import { NextRequest } from 'next/server';
import { getAuthContext, isClient, getUserAssignedClientId } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

interface SearchResult {
  id: string;
  type: 'project' | 'brand' | 'template' | 'asset';
  title: string;
  subtitle?: string;
  url: string;
}

/**
 * GET /api/search
 * Unified search across projects, brands, templates, and assets
 * Searches within document content (searchable_text) for assets
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

    // Search projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, client_name, status')
      .eq('organization_id', orgId)
      .or(`name.ilike.${searchTerm},client_name.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(5);

    if (!projectsError && projects) {
      projects.forEach((project) => {
        results.push({
          id: project.id,
          type: 'project',
          title: project.name,
          subtitle: project.client_name || undefined,
          url: `/projects/${project.id}`,
        });
      });
    }

    // Search brands
    let brandsQuery = supabase
      .from('brands')
      .select('id, company_name, domain')
      .eq('organization_id', orgId)
      .or(`company_name.ilike.${searchTerm},domain.ilike.${searchTerm}`);

    // For Client-role users: Filter by their assigned client
    const userIsClient = await isClient();
    if (userIsClient) {
      const assignedClientId = await getUserAssignedClientId();
      if (assignedClientId) {
        brandsQuery = brandsQuery.eq('client_id', assignedClientId);
      } else {
        // Client-role user with no client assignment - skip brands
        brandsQuery = brandsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Return no results
      }
    }

    const { data: brands, error: brandsError } = await brandsQuery.limit(5);

    if (!brandsError && brands) {
      brands.forEach((brand) => {
        results.push({
          id: brand.id,
          type: 'brand',
          title: brand.company_name,
          subtitle: brand.domain,
          url: `/library?tab=brands`,
        });
      });
    }

    // Search templates (check both templates and card_templates tables for backward compatibility)
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
          url: `/library?tab=templates`,
        });
      });
    }

    // Search assets (check both name, mockup_name, and searchable_text fields)
    let assetsQuery = supabase
      .from('assets')
      .select('id, name, mockup_name, searchable_text')
      .eq('organization_id', orgId)
      .or(`name.ilike.${searchTerm},mockup_name.ilike.${searchTerm},searchable_text.ilike.${searchTerm}`);

    // For Client-role users: Filter assets by client_id via projects
    if (userIsClient) {
      const assignedClientId = await getUserAssignedClientId();
      if (assignedClientId) {
        // Get all projects for the assigned client
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('client_id', assignedClientId)
          .eq('organization_id', orgId);

        const projectIds = projects?.map(p => p.id) || [];
        if (projectIds.length > 0) {
          assetsQuery = assetsQuery.in('project_id', projectIds);
        } else {
          // No projects for this client - return no results
          assetsQuery = assetsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Return no results
        }
      } else {
        // Client-role user with no client assignment - return no results
        assetsQuery = assetsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Return no results
      }
    }

    const { data: assets, error: assetsError } = await assetsQuery.limit(5);

    if (!assetsError && assets) {
      assets.forEach((asset: any) => {
        results.push({
          id: asset.id,
          type: 'asset',
          title: asset.mockup_name || asset.name || 'Unnamed Asset',
          url: `/library?tab=assets`,
        });
      });
    }

    // Sort results by type priority (projects, brands, assets, templates)
    const typeOrder = { project: 0, brand: 1, asset: 2, template: 3 };
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

