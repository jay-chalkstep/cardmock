import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/contracts/[id]/routing-recipients/[recipientId]
 *
 * Remove recipient from saved list
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; recipientId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id, recipientId } = await context.params;

    logger.api(`/api/contracts/${id}/routing-recipients/${recipientId}`, 'DELETE', { orgId });

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

    // Check if recipient exists
    const { data: recipient } = await supabaseServer
      .from('contract_routing_recipients')
      .select('id')
      .eq('id', recipientId)
      .eq('contract_id', id)
      .eq('organization_id', orgId)
      .single();

    if (!recipient) {
      return notFoundResponse('Recipient not found');
    }

    // Delete recipient
    const { error } = await supabaseServer
      .from('contract_routing_recipients')
      .delete()
      .eq('id', recipientId)
      .eq('contract_id', id)
      .eq('organization_id', orgId);

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ message: 'Recipient removed successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to remove routing recipient');
  }
}

