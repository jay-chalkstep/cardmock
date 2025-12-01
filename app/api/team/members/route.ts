import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/team/members
 * Get all team members in the organization
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const supabase = createServerAdminClient();

    logger.api('/api/team/members', 'GET', { orgId, userId });

    // Fetch all members from org_memberships
    const { data: members, error } = await supabase
      .from('org_memberships')
      .select('user_id, user_name, user_email, user_image_url, role, created_at')
      .eq('organization_id', orgId)
      .order('user_name', { ascending: true });

    if (error) {
      return handleSupabaseError(error);
    }

    interface OrgMember {
      user_id: string;
      user_name: string | null;
      user_email: string | null;
      user_image_url: string | null;
      role: string;
    }

    // Transform to expected format
    const formattedMembers = (members || []).map((member: OrgMember) => ({
      id: member.user_id,
      name: member.user_name || 'Unknown',
      email: member.user_email || '',
      avatar: member.user_image_url,
      role: member.role,
    }));

    return successResponse({ members: formattedMembers });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch team members');
  }
}
