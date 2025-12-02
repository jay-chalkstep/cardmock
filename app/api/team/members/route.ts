import { NextRequest } from 'next/server';
import { getAuthContext, getOrgMembers } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/team/members
 * Get all team members in the organization (excluding current user)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    logger.api('/api/team/members', 'GET', { orgId, userId });

    // Fetch members from Clerk (excluding current user)
    const members = await getOrgMembers(orgId, userId);

    logger.info('Team members fetched successfully', { orgId, count: members.length });

    return successResponse({ members });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch team members');
  }
}
