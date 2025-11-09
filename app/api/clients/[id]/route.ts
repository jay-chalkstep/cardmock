import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clients/[id]
 *
 * Get a single client
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

    logger.api(`/api/clients/${id}`, 'GET', { orgId });

    const { data: client, error } = await supabaseServer
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !client) {
      return notFoundResponse('Client not found');
    }

    return successResponse({ client });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch client');
  }
}

/**
 * PATCH /api/clients/[id]
 *
 * Update a client
 *
 * Body:
 * {
 *   name?: string,
 *   email?: string,
 *   phone?: string,
 *   address?: string,
 *   notes?: string,
 *   ein?: string,
 *   parent_client_id?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;
    const body = await request.json();
    const { name, email, phone, address, notes, ein, parent_client_id } = body;

    logger.api(`/api/clients/${id}`, 'PATCH', { orgId });

    // Check if client exists
    const { data: existingClient } = await supabaseServer
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existingClient) {
      return notFoundResponse('Client not found');
    }

    // Validate parent_client_id if provided
    if (parent_client_id !== undefined) {
      if (parent_client_id === null) {
        // Setting to null is allowed (removing parent)
      } else if (parent_client_id === id) {
        return badRequestResponse('Client cannot be its own parent');
      } else {
        // Check if parent client exists
        const { data: parentClient } = await supabaseServer
          .from('clients')
          .select('id')
          .eq('id', parent_client_id)
          .eq('organization_id', orgId)
          .single();

        if (!parentClient) {
          return badRequestResponse('Parent client not found');
        }

        // Check for circular reference using database function
        const { data: isValid, error: checkError } = await supabaseServer
          .rpc('check_client_hierarchy_valid', {
            client_id: id,
            new_parent_id: parent_client_id
          });

        if (checkError || !isValid) {
          return badRequestResponse('Cannot set parent client: would create circular reference');
        }
      }
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return badRequestResponse('Client name cannot be empty');
      }
      if (name.trim().length > 200) {
        return badRequestResponse('Client name must be less than 200 characters');
      }
      updateData.name = name.trim();
    }
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (ein !== undefined) updateData.ein = ein?.trim() || null;
    if (parent_client_id !== undefined) updateData.parent_client_id = parent_client_id;

    // Update client
    const { data: client, error } = await supabaseServer
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ client });
  } catch (error) {
    return errorResponse(error, 'Failed to update client');
  }
}

/**
 * DELETE /api/clients/[id]
 *
 * Delete a client
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/clients/${id}`, 'DELETE', { orgId });

    // Check if client exists
    const { data: existingClient } = await supabaseServer
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existingClient) {
      return notFoundResponse('Client not found');
    }

    // Check if client has contracts
    const { count: contractsCount } = await supabaseServer
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id);

    if (contractsCount && contractsCount > 0) {
      return badRequestResponse('Cannot delete client with existing contracts. Please delete contracts first.');
    }

    // Delete client
    const { error } = await supabaseServer
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ message: 'Client deleted successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to delete client');
  }
}

