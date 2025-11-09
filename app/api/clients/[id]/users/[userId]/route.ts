import { NextRequest } from 'next/server';
import { getAuthContext, requireAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/clients/[id]/users/[userId]
 *
 * Remove a user from a client
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    // Only admins can remove user assignments
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof Response) return adminCheck;
    
    const { id, userId: targetUserId } = await context.params;

    logger.api(`/api/clients/${id}/users/${targetUserId}`, 'DELETE', { orgId, userId });

    // Check if client exists
    const { data: client } = await supabaseServer
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!client) {
      return notFoundResponse('Client not found');
    }

    // Check if assignment exists
    const { data: assignment } = await supabaseServer
      .from('client_users')
      .select('*')
      .eq('client_id', id)
      .eq('user_id', targetUserId)
      .eq('organization_id', orgId)
      .single();

    if (!assignment) {
      return notFoundResponse('User assignment not found');
    }

    // Delete assignment
    const { error } = await supabaseServer
      .from('client_users')
      .delete()
      .eq('id', assignment.id);

    if (error) {
      return handleSupabaseError(error);
    }

    logger.info('User removed from client', { 
      clientId: id, 
      userId: targetUserId, 
      removedBy: userId 
    });

    return successResponse({ message: 'User removed from client successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to remove user from client');
  }
}
