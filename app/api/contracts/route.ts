import { NextRequest } from 'next/server';
import { getAuthContext, isClient, getUserAssignedClientId } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { checkRequiredFields } from '@/lib/api/error-handler';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { clerkClient } from '@clerk/nextjs/server';
import { createContractNotification } from '@/lib/email/contract-notifications';

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
    let clientId = searchParams.get('client_id');
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('type');

    logger.api('/api/contracts', 'GET', { orgId, clientId, statusFilter, typeFilter });

    // For Client-role users: Filter by their assigned client
    const userIsClient = await isClient();
    if (userIsClient) {
      const assignedClientId = await getUserAssignedClientId();
      if (assignedClientId) {
        // Override any clientId query param with assigned client
        clientId = assignedClientId;
      } else {
        // Client-role user with no client assignment - return empty array
        return successResponse({ contracts: [] });
      }
    }

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
      .select('*')
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    // Fetch related client and project separately to avoid join issues
    let clientData = null;
    let projectData = null;

    if (contract.client_id) {
      const { data: fetchedClient } = await supabaseServer
        .from('clients')
        .select('id, name, email, phone')
        .eq('id', contract.client_id)
        .eq('organization_id', orgId)
        .single();
      clientData = fetchedClient;
    }

    if (contract.project_id) {
      const { data: fetchedProject } = await supabaseServer
        .from('projects')
        .select('id, name')
        .eq('id', contract.project_id)
        .eq('organization_id', orgId)
        .single();
      projectData = fetchedProject;
    }

    // Enrich contract with related data
    const enrichedContract = {
      ...contract,
      clients: clientData,
      projects: projectData,
    };

    // Send notifications to organization members (non-blocking)
    try {
      const client = await clerkClient();
      const { data: memberships } = await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
      });

      const memberIds = memberships
        .map(m => m.publicUserData?.userId)
        .filter((id): id is string => !!id && id !== userId);

      if (memberIds.length > 0) {
        const clientName = (clientData as any)?.name || 'Unknown Client';
        const user = await client.users.getUser(userId);
        const userName = user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Unknown User';

        await createContractNotification(
          memberIds,
          orgId,
          'contract_created',
          `New Contract Created: ${finalContractNumber}`,
          `${userName} created a new contract for ${clientName}`,
          contract.id,
          {
            contract_number: finalContractNumber,
            client_name: clientName,
            created_by_name: userName,
          }
        );
      }
    } catch (notifError) {
      logger.error('Failed to send contract creation notifications', notifError, { contractId: contract.id });
      // Don't fail the request if notifications fail
    }

    return successResponse({ contract: enrichedContract }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create contract');
  }
}

