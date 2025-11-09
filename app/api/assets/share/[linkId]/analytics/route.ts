/**
 * GET /api/assets/share/[linkId]/analytics
 * Get analytics for a public share link
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/assets/share/[linkId]/analytics
 * Get analytics for a public share link
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { linkId } = await context.params;
    
    logger.api(`/api/assets/share/${linkId}/analytics`, 'GET', { orgId });
    
    // Verify share link belongs to organization
    const { data: shareLink, error: linkError } = await supabaseServer
      .from('public_share_links')
      .select('id')
      .eq('id', linkId)
      .eq('organization_id', orgId)
      .single();
    
    if (linkError || !shareLink) {
      return notFoundResponse('Share link not found');
    }
    
    // Get analytics data
    const { data: analytics, error: analyticsError } = await supabaseServer
      .from('public_share_analytics')
      .select('*')
      .eq('link_id', linkId)
      .order('created_at', { ascending: false });
    
    if (analyticsError) {
      return errorResponse(analyticsError, 'Failed to fetch analytics');
    }
    
    // Calculate summary statistics
    const totalViews = analytics?.length || 0;
    const uniqueViewers = new Set(analytics?.map(a => a.viewer_ip)).size;
    
    let totalComments = 0;
    let totalApprovals = 0;
    let totalTimeSpent = 0;
    const actionsBreakdown = {
      view: 0,
      comment: 0,
      approve: 0,
    };
    
    analytics?.forEach((entry) => {
      if (entry.actions_taken) {
        entry.actions_taken.forEach((action: string) => {
          if (action === 'view') {
            actionsBreakdown.view++;
          } else if (action === 'comment') {
            actionsBreakdown.comment++;
            totalComments++;
          } else if (action === 'approve') {
            actionsBreakdown.approve++;
            totalApprovals++;
          }
        });
      }
      
      if (entry.time_spent) {
        totalTimeSpent += entry.time_spent;
      }
    });
    
    const averageTimeSpent = totalViews > 0 ? totalTimeSpent / totalViews : 0;
    
    // Get recent activity (last 20)
    const recentActivity = analytics?.slice(0, 20).map((entry) => ({
      id: entry.id,
      action: entry.actions_taken?.[0] || 'view',
      timestamp: entry.created_at,
      viewerIp: entry.viewer_ip,
    })) || [];
    
    return successResponse({
      linkId: shareLink.id,
      totalViews,
      totalComments,
      totalApprovals,
      uniqueViewers,
      averageTimeSpent,
      actionsBreakdown,
      recentActivity,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to get share link analytics');
  }
}

