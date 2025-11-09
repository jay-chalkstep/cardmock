import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import type {
  MockupStageUserApproval,
  ApprovalProgress,
  ApprovalsByStage,
  AssetApprovalSummary,
  WorkflowStage
} from '@/lib/supabase';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/mockups/[id]/approvals
 *
 * Fetches all user approvals for all stages of a mockup
 * Returns approval summary with progress per stage
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id: mockupId } = await context.params;

    logger.api(`/api/mockups/${mockupId}/approvals`, 'GET', { orgId });

    // Fetch mockup with project and workflow
    const { data: mockup, error: mockupError } = await supabase
      .from('assets')
      .select(`
        *,
        project:projects(
          *,
          workflows(*)
        )
      `)
      .eq('id', mockupId)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    if (!mockup.project_id) {
      return successResponse({
        approvals_by_stage: {},
        progress_summary: {},
        final_approval: null
      });
    }

    const project = (mockup as any).project;
    const workflow = project?.workflows;
    const stages = (workflow?.stages as WorkflowStage[]) || [];

    // Fetch all user approvals for this mockup
    const { data: userApprovals, error: approvalsError } = await supabase
      .from('mockup_stage_user_approvals')
      .select('*')
      .eq('asset_id', mockupId)
      .order('created_at', { ascending: true });

    if (approvalsError) {
      return handleSupabaseError(approvalsError);
    }

    // Fetch stage progress for all stages
    const { data: stageProgress, error: progressError } = await supabase
      .from('mockup_stage_progress')
      .select('*')
      .eq('asset_id', mockupId)
      .order('stage_order', { ascending: true });

    if (progressError) {
      return handleSupabaseError(progressError);
    }

    // Group approvals by stage
    const approvalsByStage: ApprovalsByStage = (userApprovals || []).reduce(
      (acc, approval) => {
        if (!acc[approval.stage_order]) {
          acc[approval.stage_order] = [];
        }
        acc[approval.stage_order].push(approval);
        return acc;
      },
      {} as ApprovalsByStage
    );

    // Build progress summary for each stage
    const progressSummary: { [stage_order: number]: ApprovalProgress } = {};

    (stageProgress || []).forEach((progress) => {
      const stage = stages.find((s) => s.order === progress.stage_order);
      const stageApprovals = approvalsByStage[progress.stage_order] || [];

      progressSummary[progress.stage_order] = {
        stage_order: progress.stage_order,
        stage_name: stage?.name,
        stage_color: stage?.color,
        approvals_required: progress.approvals_required || 0,
        approvals_received: progress.approvals_received || 0,
        is_complete: progress.approvals_received >= progress.approvals_required,
        user_approvals: stageApprovals
      };
    });

    // Build final approval summary
    const finalApproval = mockup.final_approved_by
      ? {
          approved_by: mockup.final_approved_by,
          approved_at: mockup.final_approved_at,
          notes: mockup.final_approval_notes
        }
      : null;

    const summary: AssetApprovalSummary = {
      approvals_by_stage: approvalsByStage,
      progress_summary: progressSummary,
      final_approval: finalApproval as any
    };

    logger.info('Approvals fetched successfully', {
      mockupId,
      stagesCount: Object.keys(approvalsByStage).length,
    });

    return successResponse(summary);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch approvals');
  }
}
