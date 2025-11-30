import { NextRequest } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthContext, requireAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ invitationId: string }>;
}

/**
 * DELETE /api/admin/users/invite/[invitationId]
 *
 * Revoke a pending invitation
 * Requires admin role
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { invitationId } = await params;

    // Check auth and admin status
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId, userId } = authResult;

    const adminCheck = await requireAdmin();
    if (adminCheck instanceof Response) return adminCheck;

    logger.api('/api/admin/users/invite/[invitationId]', 'DELETE', { orgId, invitationId });

    const client = await clerkClient();

    // Verify the invitation exists and belongs to this org
    const invitationsResponse = await client.organizations.getOrganizationInvitationList({
      organizationId: orgId,
    });

    const invitation = invitationsResponse.data.find((inv) => inv.id === invitationId);

    if (!invitation) {
      return notFoundResponse('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      return errorResponse(new Error('Cannot revoke a non-pending invitation'), 'Invitation is no longer pending', 400);
    }

    // Revoke the invitation
    await client.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId: invitationId,
      requestingUserId: userId,
    });

    logger.info('Invitation revoked', {
      orgId,
      invitationId,
      email: invitation.emailAddress,
      revokedBy: userId,
    });

    return successResponse({ message: 'Invitation revoked successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to revoke invitation');
  }
}
