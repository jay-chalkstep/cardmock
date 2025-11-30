import { NextRequest } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthContext, requireAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/invite
 *
 * Invite a new member to the organization
 * Requires admin role
 *
 * Body: { email: string, role: 'org:admin' | 'org:member' }
 */
export async function POST(request: NextRequest) {
  try {
    // Check auth and admin status
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId, userId } = authResult;

    const adminCheck = await requireAdmin();
    if (adminCheck instanceof Response) return adminCheck;

    // Parse request body
    const body = await request.json();
    const { email, role } = body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return badRequestResponse('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse('Invalid email format');
    }

    const validRoles = ['org:admin', 'org:member'];
    if (!role || !validRoles.includes(role)) {
      return badRequestResponse('Role must be org:admin or org:member');
    }

    logger.api('/api/admin/users/invite', 'POST', { orgId, email, role });

    const client = await clerkClient();

    // Check if user is already a member
    const existingMembers = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const alreadyMember = existingMembers.data.some(
      (m) => m.publicUserData?.identifier?.toLowerCase() === email.toLowerCase()
    );

    if (alreadyMember) {
      return badRequestResponse('User is already a member of this organization');
    }

    // Check for existing pending invitation
    const existingInvitations = await client.organizations.getOrganizationInvitationList({
      organizationId: orgId,
    });

    const pendingInvite = existingInvitations.data.find(
      (inv) => inv.emailAddress.toLowerCase() === email.toLowerCase() && inv.status === 'pending'
    );

    if (pendingInvite) {
      return badRequestResponse('An invitation has already been sent to this email');
    }

    // Create the invitation
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role: role,
      inviterUserId: userId,
    });

    logger.info('Organization invitation sent', {
      orgId,
      invitationId: invitation.id,
      email,
      role,
      invitedBy: userId,
    });

    return successResponse({
      invitation: {
        id: invitation.id,
        email: invitation.emailAddress,
        role: invitation.role,
        status: invitation.status,
        createdAt: invitation.createdAt ? new Date(invitation.createdAt).toISOString() : new Date().toISOString(),
      },
    }, 201);
  } catch (error: any) {
    // Handle Clerk-specific errors
    if (error?.errors) {
      const clerkError = error.errors[0];
      if (clerkError?.code === 'form_identifier_exists') {
        return badRequestResponse('This email is already associated with an invitation');
      }
    }
    return errorResponse(error, 'Failed to send invitation');
  }
}
