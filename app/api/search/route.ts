import { NextRequest } from 'next/server';
import { getAuthContext, isClient, getUserAssignedClientId } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

interface SearchResult {
  id: string;
  type: 'project' | 'brand' | 'template' | 'asset' | 'contract';
  title: string;
  subtitle?: string;
  url: string;
}

/**
 * GET /api/search
 * Unified search across projects, brands, templates, assets, and contracts
 * Searches within document content (searchable_text) for contracts and assets
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
      .select('id, name, mockup_name, contract_id, searchable_text')
      .eq('organization_id', orgId)
      .or(`name.ilike.${searchTerm},mockup_name.ilike.${searchTerm},searchable_text.ilike.${searchTerm}`);

    // For Client-role users: Filter assets by contract -> client
    if (userIsClient) {
      const assignedClientId = await getUserAssignedClientId();
      if (assignedClientId) {
        // Get all contracts for the assigned client
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id')
          .eq('client_id', assignedClientId)
          .eq('organization_id', orgId);

        const contractIds = contracts?.map(c => c.id) || [];
        if (contractIds.length > 0) {
          assetsQuery = assetsQuery.in('contract_id', contractIds);
        } else {
          // No contracts for this client - return no results
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

    // Search contracts (by contract number, title, description, and document content)
    // First, get all contracts for the organization (with client filtering if needed)
    let allContractsQuery = supabase
      .from('contracts')
      .select('id, contract_number, title, description, client_id')
      .eq('organization_id', orgId);

    // For Client-role users: Filter by their assigned client
    if (userIsClient) {
      const assignedClientId = await getUserAssignedClientId();
      if (assignedClientId) {
        allContractsQuery = allContractsQuery.eq('client_id', assignedClientId);
      } else {
        // Client-role user with no client assignment - skip contracts
        allContractsQuery = allContractsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Return no results
      }
    }

    const { data: allContracts, error: allContractsError } = await allContractsQuery;

    if (!allContractsError && allContracts && allContracts.length > 0) {
      const allContractIds = allContracts.map(c => c.id);
      const matchingContractIds = new Set<string>();

      // Search contracts by metadata (contract_number, title, description)
      allContracts.forEach((contract) => {
        const contractNumberMatch = contract.contract_number?.toLowerCase().includes(query.toLowerCase());
        const titleMatch = contract.title?.toLowerCase().includes(query.toLowerCase());
        const descriptionMatch = contract.description?.toLowerCase().includes(query.toLowerCase());
        
        if (contractNumberMatch || titleMatch || descriptionMatch) {
          matchingContractIds.add(contract.id);
        }
      });

      // Search within contract documents' searchable_text
      // Only search documents that have searchable_text populated
      const { data: documents, error: documentsError } = await supabase
        .from('contract_documents')
        .select('contract_id, file_name, searchable_text')
        .in('contract_id', allContractIds)
        .not('searchable_text', 'is', null)
        .ilike('searchable_text', searchTerm)
        .eq('is_current', true)
        .limit(20);

      if (!documentsError && documents) {
        // Add contract IDs from documents that match
        documents.forEach((doc) => {
          matchingContractIds.add(doc.contract_id);
        });
      }

      // Add matching contracts to results
      allContracts.forEach((contract) => {
        if (matchingContractIds.has(contract.id)) {
          results.push({
            id: contract.id,
            type: 'contract',
            title: contract.contract_number,
            subtitle: contract.title || 'Contract',
            url: `/contracts/${contract.id}`,
          });
        }
      });
    }

    // Sort results by type priority (projects, brands, contracts, assets, templates)
    const typeOrder = { project: 0, brand: 1, contract: 2, asset: 3, template: 4 };
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

