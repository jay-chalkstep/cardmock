import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { checkRequiredFields } from '@/lib/api/error-handler';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/[id]/payment-methods
 *
 * Get all payment methods for a contract
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

    logger.api(`/api/contracts/${id}/payment-methods`, 'GET', { orgId });

    // Check if contract exists
    const { data: contract } = await supabaseServer
      .from('contracts')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!contract) {
      return notFoundResponse('Contract not found');
    }

    // Get payment methods
    const { data: paymentMethods, error } = await supabaseServer
      .from('payment_methods')
      .select('*')
      .eq('contract_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ payment_methods: paymentMethods || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch payment methods');
  }
}

/**
 * POST /api/contracts/[id]/payment-methods
 *
 * Create a new payment method
 *
 * Body:
 * {
 *   type: string (required, e.g., 'prepaid_card', 'check', 'amazon_card', 'custom'),
 *   details: object (required, flexible schema based on type),
 *   status?: string (default: 'pending_approval')
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;
    const body = await request.json();
    const { type, details, status = 'pending_approval' } = body;

    logger.api(`/api/contracts/${id}/payment-methods`, 'POST', { orgId, userId });

    // Check if contract exists
    const { data: contract } = await supabaseServer
      .from('contracts')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!contract) {
      return notFoundResponse('Contract not found');
    }

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['type', 'details']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    // Validate type
    if (typeof type !== 'string' || type.trim().length === 0) {
      return badRequestResponse('Type is required');
    }

    // Validate details is an object
    if (typeof details !== 'object' || details === null) {
      return badRequestResponse('Details must be an object');
    }

    // Create payment method
    const { data: paymentMethod, error } = await supabaseServer
      .from('payment_methods')
      .insert({
        contract_id: id,
        type: type.trim(),
        details,
        status,
        organization_id: orgId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ payment_method: paymentMethod }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create payment method');
  }
}

