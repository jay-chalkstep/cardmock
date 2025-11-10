'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  ArrowRight,
  Workflow as WorkflowIcon,
  CheckCircle,
  XCircle,
  ExternalLink,
  Briefcase,
} from 'lucide-react';
import type { CardMockup, Project, Workflow, WorkflowStageColor } from '@/lib/supabase';

interface ReviewPreviewProps {
  mockupId: string;
  projectId: string;
  stageOrder: number;
}

interface ReviewData {
  mockup: CardMockup;
  project: Project & { workflow?: Workflow };
  stageOrder: number;
  stageName: string;
  stageColor: WorkflowStageColor;
}

export default function ReviewPreview({ mockupId, projectId, stageOrder }: ReviewPreviewProps) {
  const router = useRouter();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId && mockupId) {
      fetchReviewData();
    }
  }, [mockupId, projectId]);

  const fetchReviewData = async () => {
    if (!projectId || !mockupId) {
      setError('Missing project or mockup ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch project with workflow
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      if (!projectResponse.ok) {
        const errorData = await projectResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Failed to fetch project (${projectResponse.status})`;
        throw new Error(errorMessage);
      }
      const projectData = await projectResponse.json();
      const project = projectData.data?.project || projectData.project;
      
      if (!project) {
        throw new Error('Project not found in response');
      }

      // Fetch mockup (simple fetch, not from projects endpoint)
      const mockupResponse = await fetch(`/api/mockups/${mockupId}`);
      if (!mockupResponse.ok) {
        const errorData = await mockupResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Failed to fetch mockup (${mockupResponse.status})`;
        throw new Error(errorMessage);
      }
      const mockupData = await mockupResponse.json();
      const mockup = mockupData.data?.mockup || mockupData.mockup;
      
      if (!mockup) {
        throw new Error('Mockup not found in response');
      }

      // Find stage info from workflow
      const workflow = project.workflow;
      const stage = workflow?.stages?.find((s: any) => s.order === stageOrder);

      setData({
        mockup,
        project,
        stageOrder,
        stageName: stage?.name || `Stage ${stageOrder}`,
        stageColor: stage?.color || 'gray',
      });
    } catch (err) {
      console.error('Error fetching review data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load review details';
      
      // If project not found (404), show a more helpful message
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        setError('Project not found. The project may have been deleted or you may not have access to it.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-[var(--text-secondary)] mb-4 text-sm">
            {error || 'No data available'}
          </div>
          {error && !error.includes('not found') && (
            <button
              onClick={fetchReviewData}
              className="text-[var(--accent-blue)] hover:underline text-sm"
            >
              Try again
            </button>
          )}
          {error && error.includes('not found') && (
            <div className="text-xs text-[var(--text-tertiary)] mt-2">
              You can still view the mockup directly by clicking "Open Full Review" below.
            </div>
          )}
        </div>
      </div>
    );
  }

  const stageColorClasses: Record<WorkflowStageColor, string> = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const stageColorClass = stageColorClasses[data.stageColor] || stageColorClasses.gray;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-[var(--border-main)] px-6 py-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {data.mockup.mockup_name}
          </h2>
          <button
            onClick={() => router.push(`/mockups/${mockupId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <span>Open Full Review</span>
            <ExternalLink size={16} />
          </button>
        </div>

        {/* Project Info */}
        {data.project && (
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: data.project.color || '#3B82F6' }}
              />
              <span className="text-[var(--text-secondary)]">{data.project.name || 'Unknown Project'}</span>
            </div>
            {data.project.client_name && (
              <>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-[var(--text-secondary)]">{data.project.client_name}</span>
              </>
            )}
          </div>
        )}

        {/* Stage Badge */}
        <div className="mt-3">
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${stageColorClass}`}>
            <WorkflowIcon size={14} />
            <span>Stage {data.stageOrder}: {data.stageName}</span>
          </span>
        </div>
      </div>

      {/* Mockup Preview */}
      <div className="p-6">
        <div className="bg-[var(--bg-secondary)] rounded-lg p-8 mb-6 flex items-center justify-center min-h-[400px]">
          {data.mockup.mockup_image_url ? (
            <img
              src={data.mockup.mockup_image_url}
              alt={data.mockup.mockup_name}
              className="max-w-full max-h-[600px] object-contain rounded shadow-lg"
            />
          ) : (
            <div className="text-center text-[var(--text-tertiary)]">
              <Briefcase size={64} className="mx-auto mb-4 opacity-30" />
              <p>No preview available</p>
            </div>
          )}
        </div>

        {/* Workflow Info */}
        {data.project?.workflow && (
          <div className="bg-white rounded-lg p-5 border border-[var(--border-main)] mb-6">
            <div className="flex items-center gap-2 mb-3">
              <WorkflowIcon size={20} className="text-[var(--accent-purple)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">
                {data.project.workflow.name}
              </h3>
            </div>
            {data.project.workflow.description && (
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {data.project.workflow.description}
              </p>
            )}

            {/* Stage Progress */}
            <div className="flex items-center gap-2 flex-wrap">
              {data.project.workflow.stages.map((stage: any, idx: number) => (
                <div
                  key={stage.order}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                    stage.order === data.stageOrder
                      ? (stageColorClasses[stage.color as WorkflowStageColor] || stageColorClasses.gray)
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  <span>{stage.order}</span>
                  <span>{stage.name}</span>
                  {stage.order === data.stageOrder && (
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-[var(--bg-secondary)] rounded-lg p-5 border border-[var(--border-main)]">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push(`/mockups/${mockupId}`)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent-green)] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <CheckCircle size={18} />
              <span>Approve</span>
            </button>
            <button
              onClick={() => router.push(`/mockups/${mockupId}`)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent-orange)] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <XCircle size={18} />
              <span>Request Changes</span>
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-3 text-center">
            Quick actions will open the full review page
          </p>
        </div>
      </div>
    </div>
  );
}
