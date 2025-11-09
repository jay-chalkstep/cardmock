import { NextRequest } from 'next/server';
import { getAuthContext, isClient, getUserAssignedClientId } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/brands/[id]
 *
 * Get a single brand
 * For Client-role users: Only returns brand if client_id matches user's assigned client
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

    logger.api(`/api/brands/${id}`, 'GET', { orgId });

    const { data: brand, error } = await supabaseServer
      .from('brands')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !brand) {
      return notFoundResponse('Brand not found');
    }

    // For Client-role users: Verify brand belongs to their assigned client
    const userIsClient = await isClient();
    if (userIsClient) {
      const assignedClientId = await getUserAssignedClientId();
      if (!assignedClientId) {
        return forbiddenResponse('Client assignment required');
      }
      if (brand.client_id !== assignedClientId) {
        return forbiddenResponse('Access denied: Brand does not belong to your assigned client');
      }
    }

    return successResponse({ brand });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch brand');
  }
}

/**
 * PATCH /api/brands/[id]
 *
 * Update a brand
 *
 * Body:
 * {
 *   company_name?: string,
 *   domain?: string,
 *   description?: string,
 *   client_id?: string
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
    const { company_name, domain, description, client_id } = body;

    logger.api(`/api/brands/${id}`, 'PATCH', { orgId });

    // Check if brand exists
    const { data: existingBrand } = await supabaseServer
      .from('brands')
      .select('id, client_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existingBrand) {
      return notFoundResponse('Brand not found');
    }

    // For Client-role users: Verify brand belongs to their assigned client
    const userIsClient = await isClient();
    if (userIsClient) {
      const assignedClientId = await getUserAssignedClientId();
      if (!assignedClientId) {
        return forbiddenResponse('Client assignment required');
      }
      if (existingBrand.client_id !== assignedClientId) {
        return forbiddenResponse('Access denied: Brand does not belong to your assigned client');
      }
      // Client-role users cannot change client_id
      if (client_id !== undefined && client_id !== existingBrand.client_id) {
        return forbiddenResponse('Client-role users cannot change brand client assignment');
      }
    }

    // Validate client_id if provided
    if (client_id !== undefined && client_id !== null) {
      const { data: client } = await supabaseServer
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('organization_id', orgId)
        .single();

      if (!client) {
        return badRequestResponse('Client not found');
      }
    }

    // Build update object
    const updateData: any = {};
    if (company_name !== undefined) {
      if (typeof company_name !== 'string' || company_name.trim().length === 0) {
        return badRequestResponse('Company name cannot be empty');
      }
      updateData.company_name = company_name.trim();
    }
    if (domain !== undefined) {
      if (typeof domain !== 'string' || domain.trim().length === 0) {
        return badRequestResponse('Domain cannot be empty');
      }
      updateData.domain = domain.trim();
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (client_id !== undefined && !userIsClient) {
      // Only allow client_id changes for non-Client-role users
      updateData.client_id = client_id || null;
    }

    // Update brand
    const { data: brand, error } = await supabaseServer
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ brand });
  } catch (error) {
    return errorResponse(error, 'Failed to update brand');
  }
}

