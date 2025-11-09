import { NextRequest } from 'next/server';
import { getAuthContext, requireAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[userId]/client
 *
 * Get the client assigned to a user
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId: currentUserId, orgId } = authResult;
    
    const { userId } = await context.params;

    logger.api(`/api/users/${userId}/client`, 'GET', { orgId, currentUserId });

    // Users can only view their own client assignment, or admins can view any
    const isAdmin = await requireAdmin();
    if (userId !== currentUserId && isAdmin instanceof Response) {
      return forbiddenResponse('You can only view your own client assignment');
    }

    // Get user's client assignment
    const { data: assignment, error } = await supabaseServer
      .from('client_users')
      .select('*, client:clients(*)')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if (error || !assignment) {
      // No assignment found - return null
      return successResponse({ client: null, assignment: null });
    }

    return successResponse({ 
      client: assignment.client,
      assignment: {
        id: assignment.id,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
      }
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch user client assignment');
  }
}

/**
 * PATCH /api/users/[userId]/client
 *
 * Update a user's client assignment
 *
 * Body:
 * {
 *   client_id: string | null (null to remove assignment)
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId: currentUserId, orgId } = authResult;
    
    // Only admins can update client assignments
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof Response) return adminCheck;
    
    const { userId } = await context.params;
    const body = await request.json();
    const { client_id } = body;

    logger.api(`/api/users/${userId}/client`, 'PATCH', { orgId, currentUserId, clientId: client_id });

    // Validate client_id if provided
    if (client_id !== null && client_id !== undefined) {
      const { data: client } = await supabaseServer
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('organization_id', orgId)
        .single();

      if (!client) {
        return notFoundResponse('Client not found');
      }
    }

    // Get existing assignment
    const { data: existingAssignment } = await supabaseServer
      .from('client_users')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if (client_id === null || client_id === undefined) {
      // Remove assignment
      if (existingAssignment) {
        const { error } = await supabaseServer
          .from('client_users')
          .delete()
          .eq('id', existingAssignment.id);

        if (error) {
          return handleSupabaseError(error);
        }
      }
      return successResponse({ client: null, assignment: null });
    }

    // Update or create assignment
    if (existingAssignment) {
      // Update existing assignment
      const { data: assignment, error } = await supabaseServer
        .from('client_users')
        .update({
          client_id,
          assigned_by: currentUserId,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', existingAssignment.id)
        .select('*, client:clients(*)')
        .single();

      if (error) {
        return handleSupabaseError(error);
      }

      return successResponse({ 
        client: assignment.client,
        assignment: {
          id: assignment.id,
          assigned_at: assignment.assigned_at,
          assigned_by: assignment.assigned_by,
        }
      });
    } else {
      // Create new assignment
      const { data: assignment, error } = await supabaseServer
        .from('client_users')
        .insert({
          client_id,
          user_id: userId,
          organization_id: orgId,
          assigned_by: currentUserId,
        })
        .select('*, client:clients(*)')
        .single();

      if (error) {
        return handleSupabaseError(error);
      }

      return successResponse({ 
        client: assignment.client,
        assignment: {
          id: assignment.id,
          assigned_at: assignment.assigned_at,
          assigned_by: assignment.assigned_by,
        }
      }, 201);
    }
  } catch (error) {
    return errorResponse(error, 'Failed to update user client assignment');
  }
}
