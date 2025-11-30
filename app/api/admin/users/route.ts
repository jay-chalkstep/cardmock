import { NextRequest } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthContext, requireAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

interface OrgMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  createdAt: string;
}

interface OrgInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

/**
 * GET /api/admin/users
 *
 * Get all members and pending invitations for the organization
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  try {
    // Check auth and admin status
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const adminCheck = await requireAdmin();
    if (adminCheck instanceof Response) return adminCheck;

    logger.api('/api/admin/users', 'GET', { orgId });

    const client = await clerkClient();

    // Fetch organization members
    const membershipsResponse = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const members: OrgMember[] = membershipsResponse.data.map((membership) => ({
      id: membership.publicUserData?.userId || '',
      name: `${membership.publicUserData?.firstName || ''} ${membership.publicUserData?.lastName || ''}`.trim() || 'Unknown',
      email: membership.publicUserData?.identifier || '',
      avatar: membership.publicUserData?.imageUrl || null,
      role: membership.role,
      createdAt: membership.createdAt ? new Date(membership.createdAt).toISOString() : new Date().toISOString(),
    }));

    // Fetch pending invitations
    const invitationsResponse = await client.organizations.getOrganizationInvitationList({
      organizationId: orgId,
    });

    const invitations: OrgInvitation[] = invitationsResponse.data
      .filter((inv) => inv.status === 'pending')
      .map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        role: inv.role,
        status: inv.status || 'pending',
        createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
      }));

    logger.info('Admin users fetched successfully', {
      orgId,
      memberCount: members.length,
      invitationCount: invitations.length
    });

    return successResponse({ members, invitations });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch organization users');
  }
}
