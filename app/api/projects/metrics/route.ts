import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

interface StageBreakdownItem {
  stageName: string;
  stageColor: string;
  mockupCount: number;
  projectCount: number;
}

interface MyRecentActivity {
  projectId: string;
  projectName: string;
  projectColor: string;
  action: 'approved' | 'changes_requested';
  mockupName: string;
  stageName: string;
  timestamp: string;
  notes?: string;
}

interface TimelineEvent {
  id: string;
  type: 'mockup_added' | 'stage_changed' | 'comment_added';
  description: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  timestamp: string;
  userName: string;
}

interface ProjectHealthItem {
  projectId: string;
  projectName: string;
  reason?: string;
  progress?: number;
}

/**
 * GET /api/projects/metrics?status=active
 *
 * Get aggregated metrics across all projects for the current user
 * - Total projects, mockups, progress
 * - Aggregated stage breakdown
 * - User's recent activity
 * - Cross-project timeline
 * - Project health indicators
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'active';

    logger.api('/api/projects/metrics', 'GET', { orgId, userId, statusFilter });

    // Fetch all projects matching filter
    let query = supabaseServer
      .from('projects')
      .select('*, workflows(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      return handleSupabaseError(projectsError);
    }

    if (!projects || projects.length === 0) {
      logger.info('No projects found for metrics', { orgId, statusFilter });
      return successResponse({
        metrics: {
          totalProjects: 0,
          totalMockups: 0,
          overallProgress: 0,
          pendingReviews: 0,
          stageBreakdown: [],
          myRecentActivity: [],
          timeline: [],
          projectHealth: {
            needsAttention: [],
            nearCompletion: [],
          },
        },
      });
    }

    // Get all mockups for these projects
    const projectIds = projects.map(p => p.id);
    const { data: allMockups, error: mockupsError } = await supabaseServer
      .from('assets')
      .select('id, mockup_name, project_id, created_at, created_by')
      .in('project_id', projectIds)
      .eq('organization_id', orgId);

    if (mockupsError) {
      return handleSupabaseError(mockupsError);
    }

    const totalMockups = allMockups?.length || 0;

    // Get all stage progress for these mockups
    const mockupIds = (allMockups || []).map(m => m.id);
    let allProgress: any[] = [];
    if (mockupIds.length > 0) {
      const { data, error } = await supabaseServer
        .from('mockup_stage_progress')
        .select('*')
        .in('asset_id', mockupIds)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.warn('Error fetching stage progress, continuing without it', { error });
      } else {
        allProgress = data || [];
      }
    }

    // Calculate aggregated metrics
    const stageBreakdownMap = new Map<string, { count: number; color: string; projects: Set<string> }>();
    let totalProgressPoints = 0;
    let maxPossiblePoints = 0;
    let pendingReviewsForUser = 0;

    // Process each project
    for (const project of projects) {
      const { workflows, ...projectData } = project;
      const workflow = Array.isArray(workflows) ? workflows[0] : workflows;

      if (!workflow) continue;

      const projectMockups = (allMockups || []).filter(m => m.project_id === project.id);
      const stages = workflow.stages || [];

      // Calculate project progress
      const projectProgressByMockup = projectMockups.map(mockup => {
        const mockupProgress = allProgress.filter(p => p.mockup_id === mockup.id);
        const approvedStages = mockupProgress.filter(p => p.status === 'approved');
        return approvedStages.length;
      });

      totalProgressPoints += projectProgressByMockup.reduce((sum, p) => sum + p, 0);
      maxPossiblePoints += projectMockups.length * stages.length;

      // Aggregate stage breakdown
      const mockupsByStage: Record<number, number> = {};
      stages.forEach((stage: any) => {
        mockupsByStage[stage.order] = 0;
      });

      projectMockups.forEach(mockup => {
        const mockupProgress = allProgress.filter(p => p.mockup_id === mockup.id);

        if (mockupProgress.length === 0) {
          // Not started - assign to first stage
          mockupsByStage[1] = (mockupsByStage[1] || 0) + 1;
        } else {
          const inReviewStage = mockupProgress.find(p => p.status === 'in_review');
          if (inReviewStage) {
            mockupsByStage[inReviewStage.stage_order] = (mockupsByStage[inReviewStage.stage_order] || 0) + 1;
          } else {
            const approvedStages = mockupProgress.filter(p => p.status === 'approved');
            if (approvedStages.length > 0) {
              const maxStage = Math.max(...approvedStages.map(p => p.stage_order));
              if (maxStage === stages.length) {
                mockupsByStage[maxStage] = (mockupsByStage[maxStage] || 0) + 1;
              } else {
                const nextStage = maxStage + 1;
                mockupsByStage[nextStage] = (mockupsByStage[nextStage] || 0) + 1;
              }
            } else {
              mockupsByStage[1] = (mockupsByStage[1] || 0) + 1;
            }
          }
        }
      });

      // Add to aggregate stage breakdown
      stages.forEach((stage: any) => {
        const count = mockupsByStage[stage.order] || 0;
        if (count > 0) {
          const key = stage.name;
          const existing = stageBreakdownMap.get(key) || { count: 0, color: stage.color, projects: new Set() };
          existing.count += count;
          existing.projects.add(project.id);
          stageBreakdownMap.set(key, existing);
        }
      });

      // Count pending reviews for user (where user is assigned as reviewer at current stage)
      const { data: stageReviewers } = await supabaseServer
        .from('project_stage_reviewers')
        .select('stage_order')
        .eq('project_id', project.id)
        .eq('user_id', userId);

      if (stageReviewers && stageReviewers.length > 0) {
        const userStages = stageReviewers.map(r => r.stage_order);
        projectMockups.forEach(mockup => {
          const mockupProgress = allProgress.filter(p => p.asset_id === mockup.id);
          const inReviewStage = mockupProgress.find(p => p.status === 'in_review');
          if (inReviewStage && userStages.includes(inReviewStage.stage_order)) {
            pendingReviewsForUser++;
          }
        });
      }
    }

    // Build stage breakdown array
    const stageBreakdown: StageBreakdownItem[] = Array.from(stageBreakdownMap.entries()).map(([name, data]) => ({
      stageName: name,
      stageColor: data.color,
      mockupCount: data.count,
      projectCount: data.projects.size,
    }));

    // Calculate overall progress
    const overallProgress = maxPossiblePoints > 0
      ? Math.round((totalProgressPoints / maxPossiblePoints) * 100)
      : 0;

    // Get user's recent activity
    const myRecentActivity: MyRecentActivity[] = [];
    const userProgressRecords = allProgress
      .filter(p => p.reviewed_by === userId)
      .filter(p => p.status === 'approved' || p.status === 'changes_requested')
      .slice(0, 10);

    for (const progress of userProgressRecords) {
      const project = projects.find(p => p.id === progress.project_id);
      const mockup = allMockups?.find(m => m.id === progress.asset_id);
      const workflow = project?.workflows;
      const workflowData = Array.isArray(workflow) ? workflow[0] : workflow;
      const stage = workflowData?.stages?.find((s: any) => s.order === progress.stage_order);

      if (project && mockup && stage) {
        myRecentActivity.push({
          projectId: project.id,
          projectName: project.name,
          projectColor: project.color,
          action: progress.status as 'approved' | 'changes_requested',
          mockupName: mockup.mockup_name,
          stageName: stage.name,
          timestamp: progress.reviewed_at || progress.updated_at,
          notes: progress.review_notes,
        });
      }
    }

    // Build cross-project timeline
    const timeline: TimelineEvent[] = [];

    // Add mockup creation events (last 10)
    (allMockups || []).slice(0, 10).forEach(mockup => {
      const project = projects.find(p => p.id === mockup.project_id);
      if (project) {
        timeline.push({
          id: `mockup-${mockup.id}`,
          type: 'mockup_added',
          description: `Added mockup "${mockup.mockup_name}"`,
          projectId: project.id,
          projectName: project.name,
          projectColor: project.color,
          timestamp: mockup.created_at,
          userName: mockup.created_by,
        });
      }
    });

    // Add stage change events
    allProgress.slice(0, 10).forEach((progress, idx) => {
      const project = projects.find(p => p.id === progress.project_id);
      const mockup = allMockups?.find(m => m.id === progress.asset_id);
      const workflow = project?.workflows;
      const workflowData = Array.isArray(workflow) ? workflow[0] : workflow;
      const stage = workflowData?.stages?.find((s: any) => s.order === progress.stage_order);

      if (project && mockup && stage && (progress.status === 'approved' || progress.status === 'changes_requested')) {
        timeline.push({
          id: `stage-${idx}`,
          type: 'stage_changed',
          description: progress.status === 'approved'
            ? `Approved "${mockup.mockup_name}" at ${stage.name}`
            : `Requested changes for "${mockup.mockup_name}" at ${stage.name}`,
          projectId: project.id,
          projectName: project.name,
          projectColor: project.color,
          timestamp: progress.reviewed_at || progress.updated_at,
          userName: progress.reviewed_by || 'Unknown',
        });
      }
    });

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Build project health indicators
    const needsAttention: ProjectHealthItem[] = [];
    const nearCompletion: ProjectHealthItem[] = [];

    for (const project of projects) {
      const projectMockups = (allMockups || []).filter(m => m.project_id === project.id);
      const projectProgress = allProgress.filter(p => projectIds.includes(p.project_id) && projectMockups.some(m => m.id === p.mockup_id));

      // Check for changes requested
      const hasChangesRequested = projectProgress.some(p => p.status === 'changes_requested');
      if (hasChangesRequested) {
        needsAttention.push({
          projectId: project.id,
          projectName: project.name,
          reason: 'Has mockups with requested changes',
        });
      }

      // Check for near completion (>= 80% progress)
      const { workflows } = project;
      const workflow = Array.isArray(workflows) ? workflows[0] : workflows;
      if (workflow && projectMockups.length > 0) {
        const stages = workflow.stages || [];
        const approvedCount = projectProgress.filter(p => p.status === 'approved').length;
        const maxPossible = projectMockups.length * stages.length;
        const projectProgressPct = maxPossible > 0 ? (approvedCount / maxPossible) * 100 : 0;

        if (projectProgressPct >= 80) {
          nearCompletion.push({
            projectId: project.id,
            projectName: project.name,
            progress: Math.round(projectProgressPct),
          });
        }
      }
    }

    logger.info('Project metrics fetched successfully', {
      orgId,
      totalProjects: projects.length,
      totalMockups,
      overallProgress,
    });

    return successResponse({
      metrics: {
        totalProjects: projects.length,
        totalMockups,
        overallProgress,
        pendingReviews: pendingReviewsForUser,
        stageBreakdown,
        myRecentActivity,
        timeline: timeline.slice(0, 20),
        projectHealth: {
          needsAttention,
          nearCompletion,
        },
      },
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch aggregated metrics');
  }
}
