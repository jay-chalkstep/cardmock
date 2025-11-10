import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/[id]/routing-history
 *
 * Get all routing events for a contract
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

    logger.api(`/api/contracts/${id}/routing-history`, 'GET', { orgId });

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

    // Get routing events
    const { data: events, error } = await supabaseServer
      .from('contract_routing_events')
      .select('*')
      .eq('contract_id', id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    // Enrich events with user info
    const enrichedEvents = await Promise.all(
      (events || []).map(async (event) => {
        let routedByName = 'Unknown User';
        try {
          const client = await clerkClient();
          const user = await client.users.getUser(event.routed_by);
          routedByName = user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Unknown User';
        } catch (error) {
          logger.error('Error fetching user from Clerk:', error);
        }

        return {
          ...event,
          routed_by_name: routedByName,
        };
      })
    );

    return successResponse({ events: enrichedEvents });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch routing history');
  }
}

