import { NextRequest } from 'next/server';
import { getAuthContext, getUserInfo } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import {
  sendStageReviewNotification,
  sendChangesRequestedNotification,
  sendAllStagesApprovedNotification
} from '@/lib/email/stage-notifications';
import { createNotificationsForUsers, createNotification } from '@/lib/utils/notifications';
import { logger } from '@/lib/utils/logger';
import type { MockupStageProgress, WorkflowStage, ProjectStageReviewer } from '@/lib/supabase';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * POST /api/mockups/[id]/stage-progress/[stage_order]
 *
 * Approve or request changes for a specific stage
 *
 * Body: {
 *   action: 'approve' | 'request_changes',
 *   notes?: string
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; stage_order: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const { id: mockupId, stage_order: stageOrderStr } = await context.params;
    const stageOrder = parseInt(stageOrderStr, 10);

    logger.api(`/api/mockups/${mockupId}/stage-progress/${stageOrder}`, 'POST', { orgId, userId, mockupId, stageOrder });

    if (isNaN(stageOrder)) {
      return badRequestResponse('Invalid stage order');
    }

    const body = await request.json();
    const { action, notes } = body;

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['action']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    if (!['approve', 'request_changes'].includes(action)) {
      return badRequestResponse('Invalid action. Must be "approve" or "request_changes"');
    }

    // Fetch mockup with project and creator info
    const { data: mockup, error: mockupError } = await supabaseServer
      .from('assets')
      .select('id, mockup_name, project_id, organization_id, created_by')
      .eq('id', mockupId)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    if (!mockup.project_id) {
      return badRequestResponse('Mockup not in a project with workflow');
    }

    // Fetch project with workflow
    const { data: project, error: projectError } = await supabaseServer
      .from('projects')
      .select('id, name, workflow_id, workflows(*)')
      .eq('id', mockup.project_id)
      .eq('organization_id', orgId)
      .single();

    if (projectError || !project || !project.workflow_id) {
      return badRequestResponse('Project does not have a workflow');
    }

    const workflow = project.workflows as any;
    const stages = workflow?.stages as WorkflowStage[] || [];
    const currentStage = stages.find(s => s.order === stageOrder);

    if (!currentStage) {
      return badRequestResponse('Invalid stage');
    }

    // Verify user is assigned as reviewer for this stage
    const { data: stageReviewers, error: reviewersError } = await supabaseServer
      .from('project_stage_reviewers')
      .select('*')
      .eq('project_id', mockup.project_id)
      .eq('stage_order', stageOrder);

    if (reviewersError) {
      return handleSupabaseError(reviewersError);
    }

    const isReviewer = stageReviewers?.some((r: ProjectStageReviewer) => r.user_id === userId);

    if (!isReviewer) {
      return forbiddenResponse('You are not assigned as a reviewer for this stage');
    }

    // Fetch current stage progress
    const { data: stageProgress, error: progressError } = await supabaseServer
      .from('mockup_stage_progress')
      .select('*')
      .eq('asset_id', mockupId)
      .eq('stage_order', stageOrder)
      .single();

    if (progressError || !stageProgress) {
      return notFoundResponse('Stage progress not found');
    }

    // Verify stage is in_review
    if (stageProgress.status !== 'in_review') {
      return badRequestResponse(`Stage is not in review (current status: ${stageProgress.status})`);
    }

    // Get current user info from mock auth
    const userInfo = await getUserInfo(userId);
    const userName = userInfo.name;

    if (action === 'approve') {
      // APPROVE LOGIC
      // Update current stage to approved
      const { error: updateError } = await supabaseServer
        .from('mockup_stage_progress')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_by_name: userName,
          reviewed_at: new Date().toISOString(),
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', stageProgress.id);

      if (updateError) {
        return handleSupabaseError(updateError);
      }

      // Check if there's a next stage
      const nextStage = stages.find(s => s.order === stageOrder + 1);

      if (nextStage) {
        // Advance to next stage using our database function
        const { error: advanceError } = await supabaseServer
          .rpc('advance_to_next_stage', {
            p_mockup_id: mockupId,
            p_current_stage_order: stageOrder
          });

        if (advanceError) {
          return handleSupabaseError(advanceError);
        }

        // Send email to next stage reviewers
        const { data: nextStageReviewers } = await supabaseServer
          .from('project_stage_reviewers')
          .select('*')
          .eq('project_id', mockup.project_id)
          .eq('stage_order', nextStage.order);

        if (nextStageReviewers && nextStageReviewers.length > 0) {
          // Send email notification to each reviewer (in parallel)
          await Promise.allSettled(
            nextStageReviewers.map((reviewer: ProjectStageReviewer) =>
              sendStageReviewNotification({
                to_email: reviewer.user_id, // Assuming Clerk user ID is email or we have email mapping
                to_name: reviewer.user_name,
                mockup_name: mockup.mockup_name,
                mockup_id: mockupId,
                project_name: project.name,
                stage_name: nextStage.name,
                stage_order: nextStage.order,
                submitted_by_name: userName
              }).catch(err => {
                logger.error('Failed to send stage review notification', err, { reviewerId: reviewer.user_id });
              })
            )
          );

          // Create in-app notifications for next stage reviewers
          await createNotificationsForUsers(
            nextStageReviewers.map((r: ProjectStageReviewer) => r.user_id),
            orgId,
            'approval_request',
            `Review needed: ${mockup.mockup_name}`,
            `${userName} approved Stage ${stageOrder}. ${mockup.mockup_name} is now in "${nextStage.name}" and needs your review.`,
            `/mockups/${mockupId}`,
            mockupId,
            mockup.project_id || undefined,
            {
              stage_name: nextStage.name,
              stage_order: nextStage.order,
              project_name: project.name,
            }
          );

          // Mark notifications as sent
          await supabaseServer
            .from('mockup_stage_progress')
            .update({
              notification_sent: true,
              notification_sent_at: new Date().toISOString()
            })
            .eq('asset_id', mockupId)
            .eq('stage_order', nextStage.order);
        }
      } else {
        // This was the last stage - all stages approved!
        // Send celebration email to creator
        const creatorEmail = mockup.created_by; // Assuming this is email or we have mapping
        const creatorName = 'Creator'; // TODO: Get actual name from Clerk

        await sendAllStagesApprovedNotification({
          to_email: creatorEmail,
          to_name: creatorName,
          mockup_name: mockup.mockup_name,
          mockup_id: mockupId,
          project_name: project.name,
          total_stages: stages.length
        }).catch(err => {
          logger.error('Failed to send all approved notification', err);
        });

        // Create in-app notification for creator (final approval needed)
        await createNotification({
          userId: mockup.created_by,
          organizationId: orgId,
          type: 'final_approval',
          title: `All stages approved: ${mockup.mockup_name}`,
          message: `All ${stages.length} workflow stages have been approved. Final approval is needed.`,
          linkUrl: `/mockups/${mockupId}`,
          relatedAssetId: mockupId,
          relatedProjectId: mockup.project_id,
          metadata: {
            total_stages: stages.length,
            project_name: project.name,
          },
        });
      }

      // Fetch updated progress for response
      const { data: updatedProgress } = await supabaseServer
        .from('mockup_stage_progress')
        .select('*')
        .eq('asset_id', mockupId)
        .order('stage_order', { ascending: true });

      logger.info('Stage approved successfully', { mockupId, stageOrder, hasNextStage: !!nextStage });

      return successResponse({
        message: nextStage ? 'Stage approved, advanced to next stage' : 'All stages approved!',
        progress: updatedProgress || []
      });

    } else if (action === 'request_changes') {
      // REQUEST CHANGES LOGIC
      if (!notes || notes.trim() === '') {
        return badRequestResponse('Notes are required when requesting changes');
      }

      // Update current stage to changes_requested
      const { error: updateError } = await supabaseServer
        .from('mockup_stage_progress')
        .update({
          status: 'changes_requested',
          reviewed_by: userId,
          reviewed_by_name: userName,
          reviewed_at: new Date().toISOString(),
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', stageProgress.id);

      if (updateError) {
        return handleSupabaseError(updateError);
      }

      // Reset to first stage using our database function
      const { error: resetError } = await supabaseServer
        .rpc('reset_to_first_stage', {
          p_mockup_id: mockupId
        });

      if (resetError) {
        return handleSupabaseError(resetError);
      }

      // Send email to mockup creator
      const creatorEmail = mockup.created_by; // Assuming this is email or we have mapping
      const creatorName = 'Creator'; // TODO: Get actual name from Clerk

      await sendChangesRequestedNotification({
        to_email: creatorEmail,
        to_name: creatorName,
        mockup_name: mockup.mockup_name,
        mockup_id: mockupId,
        project_name: project.name,
        stage_name: currentStage.name,
        stage_order: stageOrder,
        requested_by_name: userName,
        notes
      }).catch(err => {
        logger.error('Failed to send changes requested notification', err);
      });

      // Create in-app notification for creator
      await createNotification({
        userId: mockup.created_by,
        organizationId: orgId,
        type: 'changes_requested',
        title: `Changes requested: ${mockup.mockup_name}`,
        message: `${userName} requested changes in "${currentStage.name}". The mockup has been reset to Stage 1.`,
        linkUrl: `/mockups/${mockupId}`,
        relatedAssetId: mockupId,
        relatedProjectId: mockup.project_id,
        metadata: {
          stage_name: currentStage.name,
          stage_order: stageOrder,
          requested_by: userName,
          notes,
        },
      });

      // Fetch updated progress for response
      const { data: updatedProgress } = await supabaseServer
        .from('mockup_stage_progress')
        .select('*')
        .eq('asset_id', mockupId)
        .order('stage_order', { ascending: true });

      logger.info('Changes requested successfully', { mockupId, stageOrder });

      return successResponse({
        message: 'Changes requested, mockup reset to Stage 1',
        progress: updatedProgress || []
      });
    }

    return badRequestResponse('Invalid action');

  } catch (error) {
    return errorResponse(error, 'Failed to process stage action');
  }
}
