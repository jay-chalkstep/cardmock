/**
 * Custom hook for managing stage progress
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import type { MockupStageProgressWithDetails, Project, Workflow } from '@/lib/supabase';

interface UseStageProgressOptions {
  mockupId: string;
  projectId?: string | null;
  enabled?: boolean;
}

export function useStageProgress({
  mockupId,
  projectId,
  enabled = true,
}: UseStageProgressOptions) {
  const [stageProgress, setStageProgress] = useState<MockupStageProgressWithDetails[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStageProgress = useCallback(async () => {
    if (!enabled || !mockupId) return;

    try {
      setLoading(true);
      setError(null);

      logger.api(`/api/mockups/${mockupId}/stage-progress`, 'GET', { mockupId });

      const response = await fetch(`/api/mockups/${mockupId}/stage-progress`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch stage progress: ${response.status}`);
      }

      const data = await response.json();
      const progress = data.progress || data.data?.progress || [];
      const workflowData = data.workflow || data.data?.workflow || null;

      logger.info('Stage progress fetched successfully', {
        mockupId,
        stagesCount: progress.length,
        hasWorkflow: !!workflowData,
      });

      setStageProgress(progress);
      setWorkflow(workflowData);

      // Fetch project data if project_id is available
      if (projectId || data.project_id) {
        const projectIdToFetch = projectId || data.project_id;
        logger.api(`/api/projects/${projectIdToFetch}`, 'GET', { projectId: projectIdToFetch });

        const projectResponse = await fetch(`/api/projects/${projectIdToFetch}`);

        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          setProject(projectData.project || projectData.data?.project || null);
        } else {
          logger.warn('Failed to fetch project data', { projectId: projectIdToFetch });
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('Failed to fetch stage progress', error, { mockupId });
    } finally {
      setLoading(false);
    }
  }, [mockupId, projectId, enabled]);

  useEffect(() => {
    fetchStageProgress();
  }, [fetchStageProgress]);

  return {
    stageProgress,
    workflow,
    project,
    loading,
    error,
    refetch: fetchStageProgress,
  };
}

