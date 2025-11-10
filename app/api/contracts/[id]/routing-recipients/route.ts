import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/[id]/routing-recipients
 *
 * Get all saved recipients for a contract
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

    logger.api(`/api/contracts/${id}/routing-recipients`, 'GET', { orgId });

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

    // Get recipients
    const { data: recipients, error } = await supabaseServer
      .from('contract_routing_recipients')
      .select('*')
      .eq('contract_id', id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ recipients: recipients || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch routing recipients');
  }
}

/**
 * POST /api/contracts/[id]/routing-recipients
 *
 * Add recipient(s) to saved list
 *
 * Body:
 * {
 *   email: string,
 *   name?: string
 * }
 * or
 * [
 *   { email: string, name?: string },
 *   ...
 * ]
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;
    const body = await request.json();

    logger.api(`/api/contracts/${id}/routing-recipients`, 'POST', { orgId });

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

    // Handle single recipient or array
    const recipients = Array.isArray(body) ? body : [body];

    // Validate recipients
    for (const recipient of recipients) {
      if (!recipient.email || typeof recipient.email !== 'string' || !recipient.email.includes('@')) {
        return badRequestResponse('Invalid email address');
      }
    }

    // Insert recipients (using upsert to handle duplicates)
    const recipientsToInsert = recipients.map(r => ({
      contract_id: id,
      email: r.email.trim().toLowerCase(),
      name: r.name?.trim() || null,
      organization_id: orgId,
    }));

    const { data: insertedRecipients, error } = await supabaseServer
      .from('contract_routing_recipients')
      .upsert(recipientsToInsert, {
        onConflict: 'contract_id,email',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ recipients: insertedRecipients || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to add routing recipients');
  }
}

