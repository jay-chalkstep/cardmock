import { NextRequest } from 'next/server';
import { getAuthContext, isClient, getUserAssignedClientId } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { checkRequiredFields } from '@/lib/api/error-handler';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import type { ProjectStatus } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects
 *
 * Get all projects for the current organization with mockup counts
 *
 * Query params:
 * - status?: 'active' | 'completed' | 'archived' (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as ProjectStatus | null;

    logger.api('/api/projects', 'GET', { orgId, statusFilter });

    // For Client-role users: Filter projects by their assigned client via contract_id
    const userIsClient = await isClient();
    let assignedClientId: string | null = null;
    if (userIsClient) {
      assignedClientId = await getUserAssignedClientId();
      if (!assignedClientId) {
        // Client-role user with no client assignment - return empty array
        return successResponse({ projects: [] });
      }
    }

    // Build query
    let query = supabaseServer
      .from('projects')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: projects, error } = await query;

    // For Client-role users: Filter projects by contract -> client
    let filteredProjects = projects || [];
    if (userIsClient && assignedClientId) {
      // Get all contracts for the assigned client
      const { data: contracts } = await supabaseServer
        .from('contracts')
        .select('id')
        .eq('client_id', assignedClientId)
        .eq('organization_id', orgId);

      const contractIds = contracts?.map(c => c.id) || [];
      if (contractIds.length > 0) {
        filteredProjects = filteredProjects.filter((p: any) => 
          p.contract_id && contractIds.includes(p.contract_id)
        );
      } else {
        // No contracts for this client - return empty array
        filteredProjects = [];
      }
    }

    if (error) {
      return handleSupabaseError(error);
    }

    // Fetch mockup counts and previews for each project
    const projectsWithCounts = await Promise.all(
      filteredProjects.map(async (project) => {
        // Get mockup count
        const { count } = await supabaseServer
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('organization_id', orgId);

        // Get up to 4 mockup previews
        const { data: mockupPreviews } = await supabaseServer
          .from('assets')
          .select('id, mockup_name, mockup_image_url')
          .eq('project_id', project.id)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(4);

        return {
          ...project,
          mockup_count: count || 0,
          mockup_previews: mockupPreviews || [],
        };
      })
    );

    return successResponse({ projects: projectsWithCounts });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch projects');
  }
}

/**
 * POST /api/projects
 *
 * Create a new project
 *
 * Body:
 * {
 *   name: string (required),
 *   client_name?: string (optional),
 *   description?: string (optional),
 *   status?: 'active' | 'completed' | 'archived' (default: 'active'),
 *   color?: string (default: '#3B82F6')
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await request.json();
    const { name, client_name, description, status, color, workflow_id } = body;

    logger.api('/api/projects', 'POST', { orgId, userId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['name']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
      return badRequestResponse('Project name is required');
    }

    // Validate name length
    if (name.trim().length > 100) {
      return badRequestResponse('Project name must be less than 100 characters');
    }

    // Validate status if provided
    const validStatuses: ProjectStatus[] = ['active', 'completed', 'archived'];
    if (status && !validStatuses.includes(status)) {
      return badRequestResponse('Invalid status. Must be: active, completed, or archived');
    }

    // Validate color format if provided (basic hex check)
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return badRequestResponse('Invalid color format. Must be a hex color (e.g., #3B82F6)');
    }

    // Create project
    const { data: project, error } = await supabaseServer
      .from('projects')
      .insert({
        name: name.trim(),
        client_name: client_name?.trim() || null,
        description: description?.trim() || null,
        status: status || 'active',
        color: color || '#3B82F6',
        workflow_id: workflow_id || null,
        organization_id: orgId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ project: { ...project, mockup_count: 0 } }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create project');
  }
}
