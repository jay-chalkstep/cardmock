import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { checkRequiredFields } from '@/lib/api/error-handler';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clients
 *
 * Get all clients for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    logger.api('/api/clients', 'GET', { orgId });

    const { data: clients, error } = await supabaseServer
      .from('clients')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ clients: clients || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch clients');
  }
}

/**
 * POST /api/clients
 *
 * Create a new client
 *
 * Body:
 * {
 *   name: string (required),
 *   email?: string (optional),
 *   phone?: string (optional),
 *   address?: string (optional),
 *   notes?: string (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await request.json();
    const { name, email, phone, address, notes } = body;

    logger.api('/api/clients', 'POST', { orgId, userId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['name']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
      return badRequestResponse('Client name is required');
    }

    // Validate name length
    if (name.trim().length > 200) {
      return badRequestResponse('Client name must be less than 200 characters');
    }

    // Create client
    const { data: client, error } = await supabaseServer
      .from('clients')
      .insert({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        organization_id: orgId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ client }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create client');
  }
}

