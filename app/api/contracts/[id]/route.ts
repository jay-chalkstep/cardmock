import { NextRequest } from 'next/server';
import { getAuthContext, isClient, getUserAssignedClientId, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { clerkClient } from '@clerk/nextjs/server';
import { createContractNotification } from '@/lib/email/contract-notifications';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/[id]
 *
 * Get a single contract with related data
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/contracts/${id}`, 'GET', { orgId });

    const { data: contract, error } = await supabaseServer
      .from('contracts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !contract) {
      return notFoundResponse('Contract not found');
    }

    // For Client-role users: Verify contract belongs to their assigned client
    const userIsClient = await isClient();
    if (userIsClient) {
      const assignedClientId = await getUserAssignedClientId();
      if (!assignedClientId) {
        return forbiddenResponse('Client assignment required');
      }
      if (contract.client_id !== assignedClientId) {
        return forbiddenResponse('Access denied: Contract does not belong to your assigned client');
      }
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

    return successResponse({ contract: enrichedContract });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch contract');
  }
}

/**
 * PATCH /api/contracts/[id]
 *
 * Update a contract
 *
 * Body:
 * {
 *   status?: string,
 *   title?: string,
 *   description?: string,
 *   start_date?: string,
 *   end_date?: string,
 *   project_id?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;
    const body = await request.json();
    const { status, title, description, start_date, end_date, project_id } = body;

    logger.api(`/api/contracts/${id}`, 'PATCH', { orgId, userId });

    // Check if contract exists
    const { data: existingContract } = await supabaseServer
      .from('contracts')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existingContract) {
      return notFoundResponse('Contract not found');
    }

    // Get old contract data to check status change
    const { data: oldContract } = await supabaseServer
      .from('contracts')
      .select('status, contract_number')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    // Build update object
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (start_date !== undefined) updateData.start_date = start_date || null;
    if (end_date !== undefined) updateData.end_date = end_date || null;
    if (project_id !== undefined) updateData.project_id = project_id || null;

    // Update contract
    const { data: contract, error } = await supabaseServer
      .from('contracts')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
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

    // Send notifications if status changed (non-blocking)
    if (status !== undefined && oldContract && oldContract.status !== status) {
      try {
        const client = await clerkClient();
        const { data: memberships } = await client.organizations.getOrganizationMembershipList({
          organizationId: orgId,
        });

        const memberIds = memberships
          .map(m => m.publicUserData?.userId)
          .filter((id): id is string => !!id);

        if (memberIds.length > 0) {
          const user = await client.users.getUser(userId);
          const userName = user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Unknown User';

          await createContractNotification(
            memberIds,
            orgId,
            'contract_status_changed',
            `Contract Status Updated: ${oldContract.contract_number}`,
            `${userName} updated contract status from ${oldContract.status.replace('_', ' ')} to ${status.replace('_', ' ')}`,
            contract.id,
            {
              contract_number: oldContract.contract_number,
              old_status: oldContract.status,
              new_status: status,
              changed_by_name: userName,
            }
          );
        }
      } catch (notifError) {
        logger.error('Failed to send contract status change notifications', notifError, { contractId: id });
        // Don't fail the request if notifications fail
      }
    }

    return successResponse({ contract: enrichedContract });
  } catch (error) {
    return errorResponse(error, 'Failed to update contract');
  }
}

/**
 * DELETE /api/contracts/[id]
 *
 * Delete a contract
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/contracts/${id}`, 'DELETE', { orgId, userId });

    // Check if contract exists and get creator info
    const { data: existingContract, error: fetchError } = await supabaseServer
      .from('contracts')
      .select('id, created_by')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !existingContract) {
      return notFoundResponse('Contract not found');
    }

    // Check permissions - only creator or admin can delete
    const userIsAdmin = await isAdmin();
    const canDelete = existingContract.created_by === userId || userIsAdmin;

    if (!canDelete) {
      return forbiddenResponse('You do not have permission to delete this contract. Only the creator or an admin can delete contracts.');
    }

    // Delete contract (cascade will handle related records)
    const { error } = await supabaseServer
      .from('contracts')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ message: 'Contract deleted successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to delete contract');
  }
}

