import { NextRequest } from 'next/server';
import { getAuthContext, isClient, getUserAssignedClientId } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { checkRequiredFields } from '@/lib/api/error-handler';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/brands
 *
 * Get all brands for the current organization
 * For Client-role users: Only returns brands where client_id matches user's assigned client
 *
 * Query params:
 * - client_id?: string (optional filter by client)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    logger.api('/api/brands', 'GET', { orgId, clientId });

    let query = supabaseServer
      .from('brands')
      .select('*')
      .eq('organization_id', orgId);

    // For Client-role users: Filter by their assigned client
    const userIsClient = await isClient();
    if (userIsClient) {
      const assignedClientId = await getUserAssignedClientId();
      if (assignedClientId) {
        query = query.eq('client_id', assignedClientId);
      } else {
        // Client-role user with no client assignment - return empty array
        return successResponse({ brands: [] });
      }
    } else if (clientId) {
      // For admin/member users: Filter by client_id if provided
      query = query.eq('client_id', clientId);
    }

    const { data: brands, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ brands: brands || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch brands');
  }
}

/**
 * POST /api/brands
 *
 * Create a new brand
 *
 * Body:
 * {
 *   company_name: string (required),
 *   domain: string (required),
 *   description?: string (optional),
 *   client_id?: string (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await request.json();
    const { company_name, domain, description, client_id } = body;

    logger.api('/api/brands', 'POST', { orgId, userId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['company_name', 'domain']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    // Validate company_name
    if (typeof company_name !== 'string' || company_name.trim().length === 0) {
      return badRequestResponse('Company name is required');
    }

    // Validate domain
    if (typeof domain !== 'string' || domain.trim().length === 0) {
      return badRequestResponse('Domain is required');
    }

    // Validate client_id if provided
    if (client_id) {
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

    // Create brand
    const { data: brand, error } = await supabaseServer
      .from('brands')
      .insert({
        company_name: company_name.trim(),
        domain: domain.trim(),
        description: description?.trim() || null,
        client_id: client_id || null,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ brand }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create brand');
  }
}

