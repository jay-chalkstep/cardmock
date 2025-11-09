import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import type { ProjectStageReviewer } from '@/lib/supabase';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]/reviewers
 *
 * Get all stage reviewers for a project, grouped by stage_order
 *
 * Returns: { stage_order: number, reviewers: ProjectStageReviewer[] }[]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const { id: projectId } = await context.params;

    logger.api(`/api/projects/${projectId}/reviewers`, 'GET', { orgId, projectId });

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('organization_id', orgId)
      .single();

    if (projectError || !project) {
      return notFoundResponse('Project not found');
    }

    // Fetch all reviewers for this project
    const { data: reviewers, error } = await supabaseServer
      .from('project_stage_reviewers')
      .select('*')
      .eq('project_id', projectId)
      .order('stage_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return handleSupabaseError(error);
    }

    // Group reviewers by stage_order
    const reviewersByStage: Record<number, ProjectStageReviewer[]> = {};
    (reviewers || []).forEach((reviewer) => {
      if (!reviewersByStage[reviewer.stage_order]) {
        reviewersByStage[reviewer.stage_order] = [];
      }
      reviewersByStage[reviewer.stage_order].push(reviewer);
    });

    // Convert to array format
    const groupedReviewers = Object.entries(reviewersByStage).map(([stage_order, reviewers]) => ({
      stage_order: parseInt(stage_order, 10),
      reviewers,
    }));

    logger.info('Project reviewers fetched successfully', { projectId, count: reviewers?.length || 0 });

    return successResponse({ reviewers: groupedReviewers });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch reviewers');
  }
}

/**
 * POST /api/projects/[id]/reviewers
 *
 * Add a reviewer to a specific stage
 *
 * Body:
 * {
 *   stage_order: number (required),
 *   user_id: string (required),
 *   user_name: string (required),
 *   user_image_url?: string (optional)
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const { id: projectId } = await context.params;

    logger.api(`/api/projects/${projectId}/reviewers`, 'POST', { orgId, userId, projectId });

    // Verify project exists and has a workflow
    const { data: project, error: projectError } = await supabaseServer
      .from('projects')
      .select('*, workflows(*)')
      .eq('id', projectId)
      .eq('organization_id', orgId)
      .single();

    if (projectError || !project) {
      return notFoundResponse('Project not found');
    }

    if (!project.workflow_id) {
      return badRequestResponse('Project does not have a workflow assigned');
    }

    const body = await request.json();
    const { stage_order, user_id, user_name, user_image_url } = body;

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['stage_order', 'user_id', 'user_name']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    if (typeof stage_order !== 'number' || stage_order < 1) {
      return badRequestResponse('stage_order must be a positive number');
    }

    // Validate that stage_order exists in the workflow
    // Handle workflows as array or object (Supabase JOIN quirk)
    const workflows = project.workflows;
    const workflow = Array.isArray(workflows) ? workflows[0] : workflows;
    const stages = Array.isArray(workflow?.stages) ? workflow.stages : [];
    const stageExists = stages.some((stage: any) => stage.order === stage_order);

    if (!stageExists) {
      return badRequestResponse(`Stage ${stage_order} does not exist in this project's workflow`);
    }

    // Check for duplicate reviewer in same stage (unique constraint will catch this too)
    const { data: existingReviewer } = await supabaseServer
      .from('project_stage_reviewers')
      .select('*')
      .eq('project_id', projectId)
      .eq('stage_order', stage_order)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingReviewer) {
      return badRequestResponse('User is already a reviewer for this stage');
    }

    // Add reviewer
    const { data: reviewer, error } = await supabaseServer
      .from('project_stage_reviewers')
      .insert({
        project_id: projectId,
        stage_order,
        user_id,
        user_name,
        user_image_url: user_image_url || null,
        added_by: userId,
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    logger.info('Reviewer added successfully', { projectId, stage_order, user_id });

    return successResponse({ reviewer }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to add reviewer');
  }
}

/**
 * DELETE /api/projects/[id]/reviewers?reviewer_id=xxx
 *
 * Remove a reviewer from a stage
 *
 * Query param:
 * - reviewer_id: UUID of the reviewer to remove
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const { id: projectId } = await context.params;
    const { searchParams } = new URL(request.url);
    const reviewerId = searchParams.get('reviewer_id');

    logger.api(`/api/projects/${projectId}/reviewers`, 'DELETE', { orgId, projectId, reviewerId });

    if (!reviewerId) {
      return badRequestResponse('reviewer_id query parameter is required');
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('organization_id', orgId)
      .single();

    if (projectError || !project) {
      return notFoundResponse('Project not found');
    }

    // Verify reviewer exists and belongs to this project
    const { data: reviewer, error: reviewerError } = await supabaseServer
      .from('project_stage_reviewers')
      .select('*')
      .eq('id', reviewerId)
      .eq('project_id', projectId)
      .single();

    if (reviewerError || !reviewer) {
      return notFoundResponse('Reviewer not found');
    }

    // Delete the reviewer
    const { error: deleteError } = await supabaseServer
      .from('project_stage_reviewers')
      .delete()
      .eq('id', reviewerId);

    if (deleteError) {
      return handleSupabaseError(deleteError);
    }

    logger.info('Reviewer removed successfully', { projectId, reviewerId });

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to remove reviewer');
  }
}
