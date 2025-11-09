import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import type { Project, CardMockup, WorkflowStage, MockupStageProgress } from '@/lib/supabase';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

interface PendingMockup {
  mockup: CardMockup;
  stage_order: number;
  stage_name: string;
  stage_color: string;
  stage_progress: MockupStageProgress;
}

interface ProjectWithPendingMockups {
  project: Project;
  pending_mockups: PendingMockup[];
}

/**
 * GET /api/reviews/my-stage-reviews
 *
 * Get all mockups awaiting review by the current user at their assigned workflow stages
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    logger.api('/api/reviews/my-stage-reviews', 'GET', { orgId, userId });

    // Find all project stages where current user is a reviewer
    const { data: myReviewerAssignments, error: reviewerError } = await supabaseServer
      .from('project_stage_reviewers')
      .select('*, projects!inner(*)')
      .eq('user_id', userId);

    if (reviewerError) {
      return handleSupabaseError(reviewerError);
    }

    if (!myReviewerAssignments || myReviewerAssignments.length === 0) {
      logger.info('No reviewer assignments found', { userId });
      return successResponse({ projects: [] });
    }

    // Group assignments by project
    const projectIds = [...new Set(myReviewerAssignments.map(r => r.project_id))];

    // Fetch all projects with workflows
    const { data: projects, error: projectsError } = await supabaseServer
      .from('projects')
      .select('*, workflows(*)')
      .in('id', projectIds)
      .eq('organization_id', orgId);

    if (projectsError) {
      return handleSupabaseError(projectsError);
    }

    // For each project, find mockups in stages where user is reviewer AND status is in_review
    const projectsWithPendingMockups: ProjectWithPendingMockups[] = [];

    for (const project of projects || []) {
      const workflow = project.workflows as any;
      const stages = workflow?.stages as WorkflowStage[] || [];

      // Get stages where user is assigned as reviewer for this project
      const userStages = myReviewerAssignments
        .filter(r => r.project_id === project.id)
        .map(r => r.stage_order);

      if (userStages.length === 0) continue;

      // Find stage progress records that are in_review for this user's stages
      const { data: pendingStageProgress, error: progressError } = await supabaseServer
        .from('mockup_stage_progress')
        .select('*')
        .eq('project_id', project.id)
        .eq('status', 'in_review')
        .in('stage_order', userStages);

      if (progressError) {
        logger.warn('Error fetching pending stage progress, continuing', { error: progressError, projectId: project.id });
        continue;
      }

      if (!pendingStageProgress || pendingStageProgress.length === 0) continue;

      // Fetch the mockups
      const mockupIds = pendingStageProgress.map(p => p.asset_id);
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
        .in('id', mockupIds)
        .eq('organization_id', orgId);

      if (mockupsError) {
        logger.warn('Error fetching mockups, continuing', { error: mockupsError, projectId: project.id });
        continue;
      }

      // Build pending mockups with stage details
      const pendingMockups: PendingMockup[] = (mockups || []).map(mockup => {
        const progress = pendingStageProgress.find(p => p.asset_id === mockup.id);
        const stage = stages.find(s => s.order === progress?.stage_order);

        return {
          mockup,
          stage_order: progress?.stage_order || 1,
          stage_name: stage?.name || 'Unknown',
          stage_color: stage?.color || 'gray',
          stage_progress: progress as MockupStageProgress
        };
      });

      if (pendingMockups.length > 0) {
        projectsWithPendingMockups.push({
          project: project as Project,
          pending_mockups: pendingMockups
        });
      }
    }

    logger.info('Stage reviews fetched successfully', { userId, projectCount: projectsWithPendingMockups.length });

    return successResponse({ projects: projectsWithPendingMockups });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch stage reviews');
  }
}
