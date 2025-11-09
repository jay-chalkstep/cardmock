import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { clerkClient } from '@clerk/nextjs/server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reports/projects?status=all|active|completed|archived
 *
 * Admin-only endpoint to generate project reports grouped by user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    // Check admin permissions
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return forbiddenResponse('Admin access required');
    }

    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';

    logger.api('/api/admin/reports/projects', 'GET', { orgId, userId, statusFilter });

    // Build query
    let query = supabaseServer
      .from('projects')
      .select(`
        id,
        name,
        client_name,
        description,
        status,
        color,
        workflow_id,
        created_by,
        created_at,
        updated_at,
        workflows (
          id,
          name,
          stages
        )
      `)
      .eq('organization_id', orgId)
      .order('created_by', { ascending: true })
      .order('created_at', { ascending: false });

    // Apply status filter if not 'all'
    if (statusFilter !== 'all' && ['active', 'completed', 'archived'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      return handleSupabaseError(projectsError);
    }

    if (!projects || projects.length === 0) {
      logger.info('No projects found for report', { orgId, statusFilter });
      return successResponse({
        reportData: [],
        summary: {
          totalProjects: 0,
          totalAssets: 0,
          activeUsers: 0,
        }
      });
    }

    // Fetch mockup counts for each project
    const projectIds = projects.map(p => p.id);
    const { data: mockupCounts } = await supabaseServer
      .from('assets')
      .select('id, project_id')
      .in('project_id', projectIds)
      .eq('organization_id', orgId);

    // Count mockups per project
    const mockupCountMap: Record<string, number> = {};
    (mockupCounts || []).forEach(m => {
      if (m.project_id) {
        mockupCountMap[m.project_id] = (mockupCountMap[m.project_id] || 0) + 1;
      }
    });

    // Fetch stage progress for workflow projects
    const workflowProjectIds = projects.filter(p => p.workflow_id).map(p => p.id);
    let stageProgressMap: Record<string, any[]> = {};

    if (workflowProjectIds.length > 0) {
      const workflowMockupIds = (mockupCounts || [])
        .filter(m => m.project_id && workflowProjectIds.includes(m.project_id))
        .map(m => m.id);

      if (workflowMockupIds.length > 0) {
        const { data: stageProgress } = await supabaseServer
          .from('mockup_stage_progress')
          .select('asset_id, stage_order, status')
          .in('asset_id', workflowMockupIds);

        // Group by project (through mockup)
        const mockupToProject: Record<string, string> = {};
        (mockupCounts || []).forEach(m => {
          if (m.project_id && m.id) {
            mockupToProject[m.id] = m.project_id;
          }
        });

        (stageProgress || []).forEach(sp => {
          const projectId = mockupToProject[sp.asset_id];
          if (projectId) {
            if (!stageProgressMap[projectId]) {
              stageProgressMap[projectId] = [];
            }
            stageProgressMap[projectId].push(sp);
          }
        });
      }
    }

    // Fetch stage reviewers count
    const { data: reviewerCounts } = await supabaseServer
      .from('project_stage_reviewers')
      .select('project_id')
      .in('project_id', projectIds);

    const reviewerCountMap: Record<string, number> = {};
    (reviewerCounts || []).forEach(r => {
      reviewerCountMap[r.project_id] = (reviewerCountMap[r.project_id] || 0) + 1;
    });

    // Get unique user IDs
    const userIds = [...new Set(projects.map(p => p.created_by))];

    // Fetch user details from Clerk
    const client = await clerkClient();
    const userDetailsPromises = userIds.map(async (userId) => {
      try {
        const user = await client.users.getUser(userId);
        return {
          id: userId,
          name: user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Unknown User',
          email: user.emailAddresses[0]?.emailAddress || '',
          avatar: user.imageUrl
        };
      } catch (error) {
        logger.error(`Error fetching user ${userId}`, error, { userId });
        return {
          id: userId,
          name: 'Unknown User',
          email: '',
          avatar: ''
        };
      }
    });

    const userDetails = await Promise.all(userDetailsPromises);
    const userMap = Object.fromEntries(userDetails.map(u => [u.id, u]));

    // Group projects by user
    const projectsByUser: Record<string, any[]> = {};
    projects.forEach(project => {
      if (!projectsByUser[project.created_by]) {
        projectsByUser[project.created_by] = [];
      }

      // Calculate workflow progress
      const workflow = Array.isArray(project.workflows) ? project.workflows[0] : project.workflows;
      const totalStages = workflow?.stages?.length || 0;
      const progressData = stageProgressMap[project.id] || [];
      const completedStages = new Set(
        progressData.filter(p => p.status === 'approved').map(p => p.stage_order)
      ).size;

      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      projectsByUser[project.created_by].push({
        id: project.id,
        name: project.name,
        client: project.client_name || 'No client',
        status: project.status,
        color: project.color,
        createdAt: project.created_at,
        daysSinceCreation,
        mockupCount: mockupCountMap[project.id] || 0,
        workflowName: workflow?.name || 'No workflow',
        hasWorkflow: !!project.workflow_id,
        totalStages,
        completedStages,
        reviewerCount: reviewerCountMap[project.id] || 0,
      });
    });

    // Format report data
    const reportData = Object.entries(projectsByUser).map(([userId, userProjects]) => {
      const user = userMap[userId];
      const totalAssets = userProjects.reduce((sum, p) => sum + p.mockupCount, 0);

      return {
        userId,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || '',
        projectCount: userProjects.length,
        totalAssets,
        projects: userProjects,
      };
    });

    // Calculate summary
    const totalProjects = projects.length;
    const totalAssets = Object.values(mockupCountMap).reduce((sum, count) => sum + count, 0);
    const activeUsers = Object.keys(projectsByUser).length;

    logger.info('Project report generated successfully', {
      orgId,
      totalProjects,
      totalAssets,
      activeUsers,
    });

    return successResponse({
      reportData,
      summary: {
        totalProjects,
        totalAssets,
        activeUsers,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error, 'Failed to generate project report');
  }
}
