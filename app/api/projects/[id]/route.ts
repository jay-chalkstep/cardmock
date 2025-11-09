import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import type { ProjectStatus } from '@/lib/supabase';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[id]
 *
 * Get a single project with mockup count and preview thumbnails
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

    logger.api(`/api/projects/${id}`, 'GET', { orgId });

    // Fetch project with workflow and contract JOIN
    const { data: project, error } = await supabaseServer
      .from('projects')
      .select('*, workflows(*), contract:contracts(*, client:clients(*))')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !project) {
      return notFoundResponse('Project not found');
    }

    // Fetch mockup count
    const { count } = await supabaseServer
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id)
      .eq('organization_id', orgId);

    // Fetch up to 4 mockup previews
    const { data: mockupPreviews } = await supabaseServer
      .from('assets')
      .select('id, mockup_name, mockup_image_url')
      .eq('project_id', id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(4);

    // Rename workflows (table name) to workflow (expected by UI)
    // Supabase may return workflows as an array or object depending on the relationship
    const { workflows, contract, ...projectData } = project;
    const workflowData = Array.isArray(workflows) ? workflows[0] : workflows;
    const contractData = Array.isArray(contract) ? contract[0] : contract;

    return successResponse({
      project: {
        ...projectData,
        workflow: workflowData || null, // Rename to match Project interface
        contract: contractData || null, // Include contract data
        mockup_count: count || 0,
        mockup_previews: mockupPreviews || [],
      },
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch project');
  }
}

/**
 * PATCH /api/projects/[id]
 *
 * Update a project
 *
 * Body:
 * {
 *   name?: string,
 *   client_name?: string,
 *   description?: string,
 *   status?: 'active' | 'completed' | 'archived',
 *   color?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/projects/${id}`, 'PATCH', { orgId, userId });

    // Fetch project to check ownership
    const { data: project, error: fetchError } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !project) {
      return notFoundResponse('Project not found');
    }

    // Check permissions - only creator or admin can edit
    const userIsAdmin = await isAdmin();
    const canEdit = project.created_by === userId || userIsAdmin;

    if (!canEdit) {
      return forbiddenResponse('You do not have permission to edit this project');
    }

    const body = await request.json();
    const { name, client_name, description, status, color, workflow_id, contract_id } = body;

    // Prepare update data
    const updateData: any = {};

    // Validate and add name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return badRequestResponse('Project name cannot be empty');
      }
      if (name.trim().length > 100) {
        return badRequestResponse('Project name must be less than 100 characters');
      }
      updateData.name = name.trim();
    }

    // Add client_name (can be null)
    if (client_name !== undefined) {
      updateData.client_name = client_name?.trim() || null;
    }

    // Add description (can be null)
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    // Validate and add status
    if (status !== undefined) {
      const validStatuses: ProjectStatus[] = ['active', 'completed', 'archived'];
      if (!validStatuses.includes(status)) {
        return badRequestResponse('Invalid status. Must be: active, completed, or archived');
      }
      updateData.status = status;
    }

    // Validate and add color
    if (color !== undefined) {
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        return badRequestResponse('Invalid color format. Must be a hex color (e.g., #3B82F6)');
      }
      updateData.color = color;
    }

    // Handle workflow_id update
    if (workflow_id !== undefined) {
      // If changing workflow (including to null), clear all stage reviewers
      if (workflow_id !== project.workflow_id) {
        // Delete all existing stage reviewers for this project
        await supabaseServer
          .from('project_stage_reviewers')
          .delete()
          .eq('project_id', id);
      }

      // Validate workflow exists if not null
      if (workflow_id !== null) {
        const { data: workflow, error: workflowError } = await supabaseServer
          .from('workflows')
          .select('id')
          .eq('id', workflow_id)
          .eq('organization_id', orgId)
          .single();

        if (workflowError || !workflow) {
          return notFoundResponse('Workflow not found');
        }
      }

      updateData.workflow_id = workflow_id;
    }

    // Handle contract_id update
    if (contract_id !== undefined) {
      // Validate contract exists if not null
      if (contract_id !== null) {
        const { data: contract, error: contractError } = await supabaseServer
          .from('contracts')
          .select('id')
          .eq('id', contract_id)
          .eq('organization_id', orgId)
          .single();

        if (contractError || !contract) {
          return notFoundResponse('Contract not found');
        }
      }

      updateData.contract_id = contract_id;
    }

    // Perform update
    const { data: updatedProject, error: updateError } = await supabaseServer
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Project updated successfully', { projectId: id });

    return successResponse({ project: updatedProject });
  } catch (error) {
    return errorResponse(error, 'Failed to update project');
  }
}

/**
 * DELETE /api/projects/[id]
 *
 * Delete a project
 *
 * Note: Mockups in the project will have their project_id set to NULL
 * due to ON DELETE SET NULL constraint in the database
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/projects/${id}`, 'DELETE', { orgId, userId });

    // Fetch project to check ownership
    const { data: project, error: fetchError } = await supabaseServer
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !project) {
      return notFoundResponse('Project not found');
    }

    // Check permissions - only creator or admin can delete
    const userIsAdmin = await isAdmin();
    const canDelete = project.created_by === userId || userIsAdmin;

    if (!canDelete) {
      return forbiddenResponse('You do not have permission to delete this project');
    }

    // Delete the project (mockups will have project_id set to NULL automatically)
    const { error: deleteError } = await supabaseServer
      .from('projects')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return handleSupabaseError(deleteError);
    }

    logger.info('Project deleted successfully', { projectId: id });

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to delete project');
  }
}
