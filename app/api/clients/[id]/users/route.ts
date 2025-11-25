import { NextRequest } from 'next/server';
import { getAuthContext, requireAdmin, getMockUserInfo, MOCK_ORG_MEMBERS } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clients/[id]/users
 *
 * Get all users assigned to a client
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

    logger.api(`/api/clients/${id}/users`, 'GET', { orgId });

    // Check if client exists
    const { data: client } = await supabaseServer
      .from('clients')
      .select('id, name')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!client) {
      return notFoundResponse('Client not found');
    }

    // Get all user assignments for this client
    const { data: assignments, error } = await supabaseServer
      .from('client_users')
      .select('*')
      .eq('client_id', id)
      .eq('organization_id', orgId)
      .order('assigned_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    // Enrich with user details from mock auth
    const enrichedAssignments = (assignments || []).map((assignment) => {
      const userInfo = getMockUserInfo(assignment.user_id);
      const nameParts = userInfo.name.split(' ');
      return {
        ...assignment,
        user: {
          id: userInfo.id,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          emailAddress: userInfo.email,
          imageUrl: userInfo.avatar,
        },
      };
    });

    return successResponse({ 
      users: enrichedAssignments,
      client
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch client users');
  }
}

/**
 * POST /api/clients/[id]/users
 *
 * Assign a user to a client
 *
 * Body:
 * {
 *   user_id: string (required, Clerk user ID)
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
    
    // Only admins can assign users to clients
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof Response) return adminCheck;
    
    const { id } = await context.params;
    const body = await request.json();
    const { user_id } = body;

    logger.api(`/api/clients/${id}/users`, 'POST', { orgId, userId, assignedUserId: user_id });

    // Validate required fields
    if (!user_id) {
      return badRequestResponse('user_id is required');
    }

    // Check if client exists
    const { data: client } = await supabaseServer
      .from('clients')
      .select('id, name')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!client) {
      return notFoundResponse('Client not found');
    }

    // Verify user exists in mock org members
    const mockUser = MOCK_ORG_MEMBERS.find(m => m.id === user_id);
    if (!mockUser) {
      return badRequestResponse('User not found');
    }

    // In dev mode, allow any user to be assigned (skip role check)
    // In production, this would verify user has Client role

    // Check if user already has a client assigned
    const { data: existingAssignment } = await supabaseServer
      .from('client_users')
      .select('*')
      .eq('user_id', user_id)
      .eq('organization_id', orgId)
      .single();

    if (existingAssignment) {
      if (existingAssignment.client_id === id) {
        return badRequestResponse('User is already assigned to this client');
      }
      // Remove old assignment (one-to-many: one client per user)
      await supabaseServer
        .from('client_users')
        .delete()
        .eq('id', existingAssignment.id);
    }

    // Create new assignment
    const { data: assignment, error } = await supabaseServer
      .from('client_users')
      .insert({
        client_id: id,
        user_id,
        organization_id: orgId,
        assigned_by: userId,
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    logger.info('User assigned to client', { 
      clientId: id, 
      userId: user_id, 
      assignedBy: userId 
    });

    return successResponse({ assignment }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to assign user to client');
  }
}
