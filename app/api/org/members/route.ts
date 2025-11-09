import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { clerkClient } from '@clerk/nextjs/server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/org/members
 *
 * Get all members of the current user's organization
 *
 * Returns:
 * {
 *   members: [
 *     {
 *       id: string (Clerk user ID),
 *       name: string (full name),
 *       email: string,
 *       avatar: string (image URL),
 *       role: string (org:admin or org:member)
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    logger.api('/api/org/members', 'GET', { orgId, userId });

    // Fetch organization membership list from Clerk
    const client = await clerkClient();
    const { data: memberships } = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    // Transform to simple member objects
    const members = memberships
      .map((membership) => {
        const user = membership.publicUserData;
        if (!user) return null;

        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || user.identifier || 'Unknown User';

        return {
          id: user.userId,
          name: fullName,
          email: user.identifier || '',
          avatar: user.imageUrl,
          role: membership.role
        };
      })
      .filter(member => member !== null)
      .filter(member => member!.id !== userId); // Exclude current user

    logger.info('Organization members fetched successfully', { orgId, count: members.length });

    return successResponse({ members });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch organization members');
  }
}
