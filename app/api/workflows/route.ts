import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import type { WorkflowStage } from '@/lib/supabase';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows
 *
 * Get all workflows for the current organization
 *
 * Query params:
 * - is_archived?: 'true' | 'false' (default: 'false' - only show active workflows)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('is_archived') === 'true';

    logger.api('/api/workflows', 'GET', { orgId, includeArchived });

    // Build query
    let query = supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', orgId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    // Filter archived workflows unless explicitly requested
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data: workflows, error } = await query;

    if (error) {
      return handleSupabaseError(error);
    }

    // Calculate stage count for each workflow
    const workflowsWithCounts = (workflows || []).map((workflow) => ({
      ...workflow,
      stage_count: Array.isArray(workflow.stages) ? workflow.stages.length : 0,
    }));

    // Optionally fetch project count for each workflow
    const workflowsWithProjectCounts = await Promise.all(
      workflowsWithCounts.map(async (workflow) => {
        const { count } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('workflow_id', workflow.id)
          .eq('organization_id', orgId);

        return {
          ...workflow,
          project_count: count || 0,
        };
      })
    );

    return successResponse({ workflows: workflowsWithProjectCounts });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch workflows');
  }
}

/**
 * POST /api/workflows
 *
 * Create a new workflow (admin only)
 *
 * Body:
 * {
 *   name: string (required),
 *   description?: string (optional),
 *   stages: WorkflowStage[] (required, min 1 stage),
 *   is_default?: boolean (default: false)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    // Check admin permission
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return forbiddenResponse('Admin access required');
    }

    const body = await request.json();
    const { name, description, stages, is_default } = body;

    logger.api('/api/workflows', 'POST', { orgId, userId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['name', 'stages']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return badRequestResponse('Workflow name is required');
    }

    if (!Array.isArray(stages) || stages.length === 0) {
      return badRequestResponse('Workflow must have at least one stage');
    }

    // Validate each stage
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i] as WorkflowStage;

      if (!stage.name || typeof stage.name !== 'string' || stage.name.trim().length === 0) {
        return badRequestResponse(`Stage ${i + 1} must have a name`);
      }

      if (typeof stage.order !== 'number' || stage.order !== i + 1) {
        return badRequestResponse('Stage orders must be sequential starting from 1');
      }

      const validColors = ['yellow', 'green', 'blue', 'purple', 'red', 'orange', 'gray'];
      if (!stage.color || !validColors.includes(stage.color)) {
        return badRequestResponse(`Stage ${i + 1} has invalid color. Must be one of: ${validColors.join(', ')}`);
      }
    }

    // If setting as default, unset any existing default workflows
    if (is_default) {
      await supabase
        .from('workflows')
        .update({ is_default: false })
        .eq('organization_id', orgId)
        .eq('is_default', true);
    }

    // Create workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        stages: stages,
        is_default: is_default || false,
        is_archived: false,
        organization_id: orgId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    logger.info('Workflow created successfully', {
      workflowId: workflow.id,
      name: workflow.name,
      stageCount: stages.length,
    });

    return successResponse(
      {
        workflow: {
          ...workflow,
          stage_count: stages.length,
          project_count: 0,
        },
      },
      201
    );
  } catch (error) {
    return errorResponse(error, 'Failed to create workflow');
  }
}
