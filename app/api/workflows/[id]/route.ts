import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import type { WorkflowStage } from '@/lib/supabase';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/[id]
 *
 * Get a single workflow with stage count and project count
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

    logger.api(`/api/workflows/${id}`, 'GET', { orgId });

    // Fetch workflow
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !workflow) {
      return notFoundResponse('Workflow not found');
    }

    // Calculate stage count
    const stage_count = Array.isArray(workflow.stages) ? workflow.stages.length : 0;

    // Fetch project count using this workflow
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('workflow_id', id)
      .eq('organization_id', orgId);

    return successResponse({
      workflow: {
        ...workflow,
        stage_count,
        project_count: count || 0,
      },
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch workflow');
  }
}

/**
 * PATCH /api/workflows/[id]
 *
 * Update a workflow (admin only)
 *
 * Body:
 * {
 *   name?: string,
 *   description?: string,
 *   stages?: WorkflowStage[],
 *   is_default?: boolean,
 *   is_archived?: boolean
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;

    // Check admin permission
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return forbiddenResponse('Admin access required');
    }

    logger.api(`/api/workflows/${id}`, 'PATCH', { orgId });

    // Fetch workflow to check existence
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !workflow) {
      return notFoundResponse('Workflow not found');
    }

    const body = await request.json();
    const { name, description, stages, is_default, is_archived } = body;

    // Prepare update data
    const updateData: any = {};

    // Validate and add name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return badRequestResponse('Workflow name cannot be empty');
      }
      updateData.name = name.trim();
    }

    // Add description (can be null)
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    // Validate and add stages
    if (stages !== undefined) {
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

      updateData.stages = stages;
    }

    // Handle is_default toggle
    if (is_default !== undefined) {
      if (is_default && !workflow.is_default) {
        // Unset any existing default workflows before setting this one
        await supabase
          .from('workflows')
          .update({ is_default: false })
          .eq('organization_id', orgId)
          .eq('is_default', true);
      }
      updateData.is_default = is_default;
    }

    // Add is_archived
    if (is_archived !== undefined) {
      updateData.is_archived = is_archived;
    }

    // Perform update
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Workflow updated successfully', { workflowId: id });

    return successResponse({ workflow: updatedWorkflow });
  } catch (error) {
    return errorResponse(error, 'Failed to update workflow');
  }
}

/**
 * DELETE /api/workflows/[id]
 *
 * Delete a workflow (admin only)
 *
 * Note: Projects using this workflow will have their workflow_id set to NULL
 * due to ON DELETE SET NULL constraint in the database
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;

    // Check admin permission
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return forbiddenResponse('Admin access required');
    }

    logger.api(`/api/workflows/${id}`, 'DELETE', { orgId });

    // Fetch workflow to check existence
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !workflow) {
      return notFoundResponse('Workflow not found');
    }

    // Check if workflow is in use by any projects
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('workflow_id', id)
      .eq('organization_id', orgId);

    if (count && count > 0) {
      return badRequestResponse(`Cannot delete workflow: ${count} project(s) are using this workflow. Please archive it instead or reassign the projects first.`);
    }

    // Delete the workflow (projects will have workflow_id set to NULL automatically)
    const { error: deleteError } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return handleSupabaseError(deleteError);
    }

    logger.info('Workflow deleted successfully', { workflowId: id });

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to delete workflow');
  }
}
