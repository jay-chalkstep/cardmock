import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { checkRequiredFields } from '@/lib/api/error-handler';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts
 *
 * Get all contracts for the current organization
 *
 * Query params:
 * - client_id?: string (optional filter by client)
 * - status?: string (optional filter by status)
 * - type?: 'new' | 'amendment' (optional filter by type)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('type');

    logger.api('/api/contracts', 'GET', { orgId, clientId, statusFilter, typeFilter });

    // Build query - use separate selects to avoid join issues if tables don't exist
    let query = supabaseServer
      .from('contracts')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    const { data: contracts, error } = await query;

    if (error) {
      logger.error('Error fetching contracts:', error);
      return handleSupabaseError(error);
    }

    // If no contracts, return empty array
    if (!contracts || contracts.length === 0) {
      return successResponse({ contracts: [] });
    }

    // Fetch related clients and projects separately
    const clientIds = [...new Set(contracts.map(c => c.client_id).filter(Boolean))];
    const projectIds = [...new Set(contracts.map(c => c.project_id).filter(Boolean))];

    const clientsMap: Record<string, any> = {};
    const projectsMap: Record<string, any> = {};

    // Fetch clients if any
    if (clientIds.length > 0) {
      const { data: clients } = await supabaseServer
        .from('clients')
        .select('id, name, email, phone')
        .in('id', clientIds)
        .eq('organization_id', orgId);

      if (clients) {
        clients.forEach(client => {
          clientsMap[client.id] = client;
        });
      }
    }

    // Fetch projects if any
    if (projectIds.length > 0) {
      const { data: projects } = await supabaseServer
        .from('projects')
        .select('id, name')
        .in('id', projectIds)
        .eq('organization_id', orgId);

      if (projects) {
        projects.forEach(project => {
          projectsMap[project.id] = project;
        });
      }
    }

    // Enrich contracts with related data
    const enrichedContracts = contracts.map(contract => ({
      ...contract,
      clients: contract.client_id ? clientsMap[contract.client_id] : null,
      projects: contract.project_id ? projectsMap[contract.project_id] : null,
    }));

    return successResponse({ contracts: enrichedContracts });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch contracts');
  }
}

/**
 * POST /api/contracts
 *
 * Create a new contract
 *
 * Body:
 * {
 *   client_id: string (required),
 *   project_id?: string (optional),
 *   contract_number?: string (optional, auto-generated if not provided),
 *   type?: 'new' | 'amendment' (default: 'new'),
 *   parent_contract_id?: string (required if type is 'amendment'),
 *   title?: string (optional),
 *   description?: string (optional),
 *   start_date?: string (optional, ISO date),
 *   end_date?: string (optional, ISO date)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await request.json();
    const {
      client_id,
      project_id,
      contract_number,
      type = 'new',
      parent_contract_id,
      title,
      description,
      start_date,
      end_date,
    } = body;

    logger.api('/api/contracts', 'POST', { orgId, userId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['client_id']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    // Validate client exists
    const { data: client } = await supabaseServer
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('organization_id', orgId)
      .single();

    if (!client) {
      return badRequestResponse('Client not found');
    }

    // Validate amendment has parent contract
    if (type === 'amendment' && !parent_contract_id) {
      return badRequestResponse('Parent contract ID is required for amendments');
    }

    // Validate parent contract exists if provided
    if (parent_contract_id) {
      const { data: parentContract } = await supabaseServer
        .from('contracts')
        .select('id')
        .eq('id', parent_contract_id)
        .eq('organization_id', orgId)
        .single();

      if (!parentContract) {
        return badRequestResponse('Parent contract not found');
      }
    }

    // Generate contract number if not provided
    let finalContractNumber = contract_number;
    if (!finalContractNumber) {
      // Get count of contracts for this org to generate number
      const { count } = await supabaseServer
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      finalContractNumber = `CONTRACT-${String((count || 0) + 1).padStart(6, '0')}`;
    }

    // Check if contract number already exists
    const { data: existingContract } = await supabaseServer
      .from('contracts')
      .select('id')
      .eq('organization_id', orgId)
      .eq('contract_number', finalContractNumber)
      .single();

    if (existingContract) {
      return badRequestResponse('Contract number already exists');
    }

    // Create contract
    const { data: contract, error } = await supabaseServer
      .from('contracts')
      .insert({
        client_id,
        project_id: project_id || null,
        contract_number: finalContractNumber,
        type,
        parent_contract_id: parent_contract_id || null,
        title: title?.trim() || null,
        description: description?.trim() || null,
        start_date: start_date || null,
        end_date: end_date || null,
        status: 'draft',
        organization_id: orgId,
        created_by: userId,
      })
      .select('*, clients(*), projects(id, name)')
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ contract }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create contract');
  }
}

