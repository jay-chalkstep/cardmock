import { NextRequest } from 'next/server';
import { getAuthContext, getOrgMembers } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
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
 *       id: string (user ID),
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

    // Return mock organization members (excluding current user)
    const members = await getOrgMembers(orgId, userId);

    logger.info('Organization members fetched successfully', { orgId, count: members.length });

    return successResponse({ members });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch organization members');
  }
}
