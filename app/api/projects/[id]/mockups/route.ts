import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import type { MockupWithProgress, MockupStageProgress, StageStatus } from '@/lib/supabase';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/mockups
 *
 * Get all mockups for a specific project with stage progress
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const { id } = await context.params;

    logger.api(`/api/projects/${id}/mockups`, 'GET', { orgId, projectId: id });

    // Verify project exists and belongs to organization
    const { data: project, error: projectError } = await supabaseServer
      .from('projects')
      .select('id, workflow_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (projectError || !project) {
      return notFoundResponse('Project not found');
    }

    // Fetch mockups for this project with logo and template data
    const { data: mockups, error: mockupsError } = await supabaseServer
      .from('assets')
      .select(`
        *,
        logo:logo_variants!logo_id (
          id,
          logo_url
        ),
        template:templates!template_id (
          id,
          template_name,
          template_url
        )
      `)
      .eq('project_id', id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (mockupsError) {
      return handleSupabaseError(mockupsError);
    }

    // If project has a workflow, fetch stage progress for all mockups
    if (project.workflow_id && mockups && mockups.length > 0) {
      const mockupIds = mockups.map(m => m.id);

      const { data: allProgress, error: progressError } = await supabaseServer
        .from('mockup_stage_progress')
        .select('*')
        .in('asset_id', mockupIds)
        .eq('project_id', id)
        .order('asset_id', { ascending: true })
        .order('stage_order', { ascending: true });

      if (progressError) {
        logger.warn('Error fetching stage progress, continuing without it', { error: progressError });
        // Continue without progress data rather than failing
      }

      // Group progress by asset_id
      const progressByMockup = (allProgress || []).reduce((acc, p: MockupStageProgress) => {
        if (!acc[p.asset_id]) {
          acc[p.asset_id] = [];
        }
        acc[p.asset_id].push(p);
        return acc;
      }, {} as Record<string, MockupStageProgress[]>);

      // Enhance mockups with progress data
      const mockupsWithProgress: MockupWithProgress[] = mockups.map((mockup) => {
        const progress = progressByMockup[mockup.id] || [];

        // Calculate current_stage (the stage that is in_review or last approved)
        let currentStage = 1;
        const inReviewStage = progress.find((p: MockupStageProgress) => p.status === 'in_review');
        if (inReviewStage) {
          currentStage = inReviewStage.stage_order;
        } else {
          const approvedStages = progress.filter((p: MockupStageProgress) => p.status === 'approved');
          if (approvedStages.length > 0) {
            currentStage = Math.max(...approvedStages.map((p: MockupStageProgress) => p.stage_order));
          }
        }

        // Calculate overall_status
        let overallStatus: 'not_started' | 'in_progress' | 'approved' | 'changes_requested' = 'not_started';
        if (progress.length > 0) {
          const hasChangesRequested = progress.some((p: MockupStageProgress) => p.status === 'changes_requested');
          const allApproved = progress.length > 0 && progress.every((p: MockupStageProgress) => p.status === 'approved');
          const someInReview = progress.some((p: MockupStageProgress) => p.status === 'in_review');

          if (hasChangesRequested) {
            overallStatus = 'changes_requested';
          } else if (allApproved) {
            overallStatus = 'approved';
          } else if (someInReview) {
            overallStatus = 'in_progress';
          }
        }

        return {
          ...mockup,
          progress,
          current_stage: currentStage,
          overall_status: overallStatus
        };
      });

      logger.info('Project mockups fetched successfully', { projectId: id, count: mockupsWithProgress.length });

      return successResponse({ mockups: mockupsWithProgress });
    }

    logger.info('Project mockups fetched successfully', { projectId: id, count: mockups?.length || 0 });

    return successResponse({ mockups: mockups || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch project mockups');
  }
}
