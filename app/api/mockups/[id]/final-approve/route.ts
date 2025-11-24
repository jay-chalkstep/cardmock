import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabase } from '@/lib/supabase';
import { createNotificationsForUsers } from '@/lib/utils/notifications';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * POST /api/mockups/[id]/final-approve
 *
 * Records final approval by project owner after all workflow stages are complete
 * Only project creator or org admin can give final approval
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id: mockupId } = await context.params;
    const body = await request.json();
    const { notes } = body;

    logger.api(`/api/mockups/${mockupId}/final-approve`, 'POST', { orgId, userId });

    // Fetch mockup with project
    const { data: mockup, error: mockupError } = await supabase
      .from('assets')
      .select('*, project:projects(*)')
      .eq('id', mockupId)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    if (!mockup.project_id || !mockup.project) {
      return badRequestResponse('Mockup must be assigned to a project');
    }

    const project = mockup.project as any;

    // Verify user is project creator or org admin
    const isProjectCreator = project.created_by === userId;
    const userIsAdmin = await isAdmin();

    if (!isProjectCreator && !userIsAdmin) {
      return forbiddenResponse('Only project creator or organization admin can give final approval');
    }

    // Check that mockup is in pending_final_approval status
    const { data: stageProgress, error: progressError } = await supabase
      .from('mockup_stage_progress')
      .select('*')
      .eq('asset_id', mockupId)
      .eq('project_id', mockup.project_id)
      .order('stage_order', { ascending: false })
      .limit(1)
      .single();

    if (progressError || !stageProgress) {
      return notFoundResponse('No stage progress found for this mockup');
    }

    if (stageProgress.status !== 'pending_final_approval') {
      return badRequestResponse(`Cannot give final approval. Current status: ${stageProgress.status}`);
    }

    // Get user's name for display (dynamic import to avoid Edge Runtime issues)
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || 'Unknown User';

    // Record final approval using database function
    await supabase.rpc('record_final_approval', {
      p_asset_id: mockupId,
      p_user_id: userId,
      p_user_name: userName,
      p_notes: notes || null
    });

    // Fetch updated asset and progress
    const { data: updatedMockup } = await supabase
      .from('assets')
      .select('*')
      .eq('id', mockupId)
      .single();

    const { data: updatedProgress } = await supabase
      .from('mockup_stage_progress')
      .select('*')
      .eq('asset_id', mockupId)
      .order('stage_order', { ascending: true });

    // Create notifications for all stakeholders (creator and reviewers)
    const notificationUserIds: string[] = [];
    
    // Add creator if different from approver
    if (mockup.created_by && mockup.created_by !== userId) {
      notificationUserIds.push(mockup.created_by);
    }

    // Get all reviewers who participated
    const { data: reviewers } = await supabase
      .from('project_stage_reviewers')
      .select('user_id')
      .eq('project_id', mockup.project_id);

    if (reviewers) {
      reviewers.forEach((r: any) => {
        if (r.user_id !== userId && !notificationUserIds.includes(r.user_id)) {
          notificationUserIds.push(r.user_id);
        }
      });
    }

    // Create notifications for all stakeholders
    if (notificationUserIds.length > 0) {
      await createNotificationsForUsers(
        notificationUserIds,
        orgId,
        'final_approval',
        `Final approval: ${mockup.mockup_name}`,
        `${userName} gave final approval to ${mockup.mockup_name}. All workflow stages are complete.`,
        `/mockups/${mockupId}`,
        mockupId,
        mockup.project_id || undefined,
        {
          approved_by: userName,
          project_name: project.name,
        }
      );
    }

    logger.info('Final approval recorded successfully', {
      mockupId,
      approvedBy: userId,
    });

    return successResponse({
      message: 'Final approval recorded successfully',
      mockup: updatedMockup,
      progress: updatedProgress,
      final_approval: {
        approved_by: updatedMockup?.final_approved_by,
        approved_at: updatedMockup?.final_approved_at,
        notes: updatedMockup?.final_approval_notes
      }
    });
  } catch (error) {
    return errorResponse(error, 'Failed to record final approval');
  }
}
