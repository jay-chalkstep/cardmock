import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin, isClient, getUserAssignedClientId } from '@/lib/api/auth';
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

    logger.api(`/api/projects/${id}`, 'GET', { orgId, projectId: id });

    // For Client-role users: Check if they have access via client_id
    const userIsClient = await isClient();
    let assignedClientId: string | null = null;
    
    if (userIsClient) {
      assignedClientId = await getUserAssignedClientId();
      if (!assignedClientId) {
        // Client-role user with no client assignment - return not found
        return notFoundResponse('Project not found');
      }
    }

    // Build query - filter at database level for client users
    // Simplified query without nested JOINs to avoid RLS/foreign key issues
    let query = supabaseServer
      .from('projects')
      .select('*, workflows(*)')
      .eq('id', id)
      .eq('organization_id', orgId);

    // For Client-role users: Filter by client_id (direct relationship)
    // For non-client users: Show project if in organization
    if (userIsClient && assignedClientId) {
      query = query.eq('client_id', assignedClientId);
    }

    const { data: project, error } = await query.single();

    if (error) {
      logger.error('Project fetch error', {
        projectId: id,
        orgId,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return notFoundResponse('Project not found');
    }

    if (!project) {
      logger.warn('Project not found', {
        projectId: id,
        orgId,
        message: 'Query returned no results'
      });
      return notFoundResponse('Project not found');
    }

    logger.info('Project fetched successfully', {
      projectId: id,
      orgId,
      projectName: project.name
    });


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
    const { workflows, ...projectData } = project;
    const workflowData = Array.isArray(workflows) ? workflows[0] : workflows;

    return successResponse({
      project: {
        ...projectData,
        workflow: workflowData || null, // Rename to match Project interface
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
 *   client_id?: string,
 *   client_name?: string,
 *   description?: string,
 *   status?: 'active' | 'completed' | 'archived',
 *   color?: string,
 *   workflow_id?: string,
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
    const { name, client_id, client_name, description, status, color, workflow_id } = body;

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

    // Handle client_id update
    if (client_id !== undefined) {
      // Validate client_id exists and belongs to organization
      if (client_id === null || (typeof client_id === 'string' && client_id.trim().length === 0)) {
        return badRequestResponse('Client ID cannot be empty');
      }

      const { data: client, error: clientError } = await supabaseServer
        .from('clients')
        .select('id, name')
        .eq('id', client_id)
        .eq('organization_id', orgId)
        .single();

      if (clientError || !client) {
        return badRequestResponse('Client not found or does not belong to this organization');
      }

      updateData.client_id = client_id;
      // Optionally update client_name to match client if not explicitly provided
      if (client_name === undefined) {
        updateData.client_name = client.name;
      }
    }

    // Add client_name (can be null, but only if client_id is not being updated)
    if (client_name !== undefined && client_id === undefined) {
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
