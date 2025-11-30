import { NextRequest } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthContext, requireAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, forbiddenResponse } from '@/lib/api/response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * PATCH /api/admin/users/[userId]
 *
 * Update a member's role in the organization
 * Requires admin role
 *
 * Body: { role: 'org:admin' | 'org:member' }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: targetUserId } = await params;

    // Check auth and admin status
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId, userId: currentUserId } = authResult;

    const adminCheck = await requireAdmin();
    if (adminCheck instanceof Response) return adminCheck;

    // Parse request body
    const body = await request.json();
    const { role } = body;

    // Validate role
    const validRoles = ['org:admin', 'org:member'];
    if (!role || !validRoles.includes(role)) {
      return badRequestResponse('Role must be org:admin or org:member');
    }

    logger.api('/api/admin/users/[userId]', 'PATCH', { orgId, targetUserId, role });

    const client = await clerkClient();

    // Get all members to find the membership
    const membershipsResponse = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const membership = membershipsResponse.data.find(
      (m) => m.publicUserData?.userId === targetUserId
    );

    if (!membership) {
      return badRequestResponse('User is not a member of this organization');
    }

    // Prevent demoting yourself if you're the last admin
    if (targetUserId === currentUserId && role !== 'org:admin') {
      const adminCount = membershipsResponse.data.filter((m) => m.role === 'org:admin').length;
      if (adminCount <= 1) {
        return forbiddenResponse('Cannot demote yourself - you are the only admin');
      }
    }

    // Update the membership role
    await client.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId: targetUserId,
      role: role,
    });

    logger.info('Member role updated', {
      orgId,
      targetUserId,
      newRole: role,
      updatedBy: currentUserId,
    });

    return successResponse({ message: 'Role updated successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to update member role');
  }
}

/**
 * DELETE /api/admin/users/[userId]
 *
 * Remove a member from the organization
 * Requires admin role
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: targetUserId } = await params;

    // Check auth and admin status
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId, userId: currentUserId } = authResult;

    const adminCheck = await requireAdmin();
    if (adminCheck instanceof Response) return adminCheck;

    // Prevent self-removal
    if (targetUserId === currentUserId) {
      return forbiddenResponse('You cannot remove yourself from the organization');
    }

    logger.api('/api/admin/users/[userId]', 'DELETE', { orgId, targetUserId });

    const client = await clerkClient();

    // Get all members to verify the target exists and check admin count
    const membershipsResponse = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const membership = membershipsResponse.data.find(
      (m) => m.publicUserData?.userId === targetUserId
    );

    if (!membership) {
      return badRequestResponse('User is not a member of this organization');
    }

    // Prevent removing the last admin
    if (membership.role === 'org:admin') {
      const adminCount = membershipsResponse.data.filter((m) => m.role === 'org:admin').length;
      if (adminCount <= 1) {
        return forbiddenResponse('Cannot remove the only admin from the organization');
      }
    }

    // Remove the member
    await client.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId: targetUserId,
    });

    logger.info('Member removed from organization', {
      orgId,
      removedUserId: targetUserId,
      removedBy: currentUserId,
    });

    return successResponse({ message: 'Member removed successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to remove member');
  }
}
