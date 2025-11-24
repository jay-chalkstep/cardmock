import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabase } from '@/lib/supabase';
import { createNotificationsForUsers, createNotification } from '@/lib/utils/notifications';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * POST /api/mockups/[id]/approve
 *
 * Records individual user approval for the current workflow stage
 * Increments approval count and advances stage if all reviewers approved
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

    logger.api(`/api/mockups/${mockupId}/approve`, 'POST', { orgId, userId });

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
      return badRequestResponse('Mockup must be assigned to a project with a workflow');
    }

    const project = mockup.project as any;

    if (!project.workflow_id) {
      return badRequestResponse('Project must have a workflow assigned');
    }

    // Find current stage that is in_review
    const { data: currentStageProgress, error: progressError } = await supabase
      .from('mockup_stage_progress')
      .select('*')
      .eq('asset_id', mockupId)
      .eq('project_id', mockup.project_id)
      .eq('status', 'in_review')
      .single();

    if (progressError || !currentStageProgress) {
      return badRequestResponse('No stage currently in review for this mockup');
    }

    const stageOrder = currentStageProgress.stage_order;

    // Verify user is assigned as reviewer for this stage
    const { data: reviewerAssignment, error: reviewerError } = await supabase
      .from('project_stage_reviewers')
      .select('*')
      .eq('project_id', mockup.project_id)
      .eq('stage_order', stageOrder)
      .eq('user_id', userId)
      .single();

    if (reviewerError || !reviewerAssignment) {
      return forbiddenResponse('You are not assigned as a reviewer for this stage');
    }

    // Check if user has already approved
    const { data: existingApproval } = await supabase
      .from('mockup_stage_user_approvals')
      .select('*')
      .eq('asset_id', mockupId)
      .eq('stage_order', stageOrder)
      .eq('user_id', userId)
      .single();

    if (existingApproval) {
      return badRequestResponse('You have already submitted your review for this stage');
    }

    // Get user details from Clerk
    const userName = reviewerAssignment.user_name;
    const userEmail = reviewerAssignment.user_email;
    const userImageUrl = reviewerAssignment.user_image_url;

    // Record user's approval
    const { data: approval, error: approvalError } = await supabase
      .from('mockup_stage_user_approvals')
      .insert({
        asset_id: mockupId,
        project_id: mockup.project_id,
        stage_order: stageOrder,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        user_image_url: userImageUrl,
        action: 'approve',
        notes: notes || null
      })
      .select()
      .single();

    if (approvalError) {
      return handleSupabaseError(approvalError);
    }

    // Increment approval count using database function
    await supabase.rpc('increment_stage_approval_count', {
      p_asset_id: mockupId,
      p_stage_order: stageOrder
    });

    // Check if all required approvals are received
    const { data: isComplete } = await supabase.rpc('check_stage_approval_complete', {
      p_asset_id: mockupId,
      p_stage_order: stageOrder
    });

    let advancedToNextStage = false;
    let nextStageName = null;

    // If all approvals received, advance to next stage
    if (isComplete) {
      // Update current stage to approved
      await supabase
        .from('mockup_stage_progress')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_by_name: userName,
          reviewed_at: new Date().toISOString(),
          notes: `All ${currentStageProgress.approvals_required} reviewers approved`,
          updated_at: new Date().toISOString()
        })
        .eq('asset_id', mockupId)
        .eq('stage_order', stageOrder);

      // Advance to next stage
      const { data: hasNextStage } = await supabase.rpc('advance_to_next_stage', {
        p_asset_id: mockupId,
        p_current_stage_order: stageOrder
      });

      advancedToNextStage = hasNextStage;

      // If advanced to next stage, get next stage name for response
      if (hasNextStage) {
        const nextStageOrder = stageOrder + 1;
        const workflow = project.workflows as any;
        const stages = workflow?.stages || [];
        const nextStage = stages.find((s: any) => s.order === nextStageOrder);
        nextStageName = nextStage?.name;

        // Get next stage reviewers and create notifications
        const { data: nextStageReviewers } = await supabase
          .from('project_stage_reviewers')
          .select('user_id')
          .eq('project_id', mockup.project_id)
          .eq('stage_order', nextStageOrder);

        if (nextStageReviewers && nextStageReviewers.length > 0) {
          await createNotificationsForUsers(
            nextStageReviewers.map((r: any) => r.user_id),
            orgId,
            'approval_request',
            `Review needed: ${mockup.mockup_name}`,
            `All reviewers approved Stage ${stageOrder}. ${mockup.mockup_name} is now in "${nextStageName}" and needs your review.`,
            `/mockups/${mockupId}`,
            mockupId,
            mockup.project_id || undefined,
            {
              stage_name: nextStageName,
              stage_order: nextStageOrder,
              project_name: project.name,
            }
          );
        }
      } else {
        // Last stage completed - now pending final approval
        // Create notification for project owner (creator)
        await createNotification({
          userId: mockup.created_by,
          organizationId: orgId,
          type: 'final_approval',
          title: `All stages approved: ${mockup.mockup_name}`,
          message: `All workflow stages have been approved. Final approval is needed.`,
          linkUrl: `/mockups/${mockupId}`,
          relatedAssetId: mockupId,
          relatedProjectId: mockup.project_id,
          metadata: {
            project_name: project.name,
          },
        });
      }
    }

    // Fetch updated progress
    const { data: updatedProgress } = await supabase
      .from('mockup_stage_progress')
      .select('*')
      .eq('asset_id', mockupId)
      .eq('stage_order', stageOrder)
      .single();

    const message = isComplete
      ? (advancedToNextStage
        ? `Stage complete! Advanced to ${nextStageName}`
        : 'All stages complete! Pending final approval from project owner')
      : `Approval recorded. ${updatedProgress?.approvals_received} of ${updatedProgress?.approvals_required} reviewers approved`;

    logger.info('Approval recorded successfully', {
      mockupId,
      stageOrder,
      stageComplete: isComplete,
      advancedToNextStage,
    });

    return successResponse({
      approval,
      stage_complete: isComplete,
      advanced_to_next_stage: advancedToNextStage,
      next_stage_name: nextStageName,
      updated_progress: updatedProgress,
      message,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to record approval');
  }
}
