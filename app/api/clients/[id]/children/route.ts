import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clients/[id]/children
 *
 * Get all child clients of a parent client
 * Returns all clients where parent_client_id matches the given client ID
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

    logger.api(`/api/clients/${id}/children`, 'GET', { orgId });

    // Check if parent client exists
    const { data: parentClient } = await supabaseServer
      .from('clients')
      .select('id, name')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!parentClient) {
      return notFoundResponse('Parent client not found');
    }

    // Get all child clients (direct children only)
    const { data: children, error } = await supabaseServer
      .from('clients')
      .select('*')
      .eq('parent_client_id', id)
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ 
      children: children || [],
      parent: parentClient
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch child clients');
  }
}
