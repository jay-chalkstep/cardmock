'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  TrendingUp,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileImage,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StageBreakdown {
  stageOrder: number;
  stageName: string;
  stageColor: string;
  mockupCount: number;
}

interface ReviewerActivity {
  reviewerId: string;
  reviewerName: string;
  action: 'approved' | 'changes_requested';
  stageName: string;
  mockupName: string;
  timestamp: string;
  notes?: string;
}

interface TimelineEvent {
  id: string;
  type: 'mockup_added' | 'stage_changed' | 'comment_added';
  description: string;
  timestamp: string;
  userName: string;
  metadata?: any;
}

interface ProjectMetrics {
  projectId: string;
  projectName: string;
  totalMockups: number;
  stageBreakdown: StageBreakdown[];
  progressPercentage: number;
  reviewerActivity: ReviewerActivity[];
  timeline: TimelineEvent[];
}

interface ProjectMetricsProps {
  projectId: string;
}

export default function ProjectMetrics({ projectId }: ProjectMetricsProps) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchMetrics();
    }
  }, [projectId]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const result = await response.json();
      const metricsData = result.data?.metrics || result.metrics;
      if (!metricsData) throw new Error('Metrics not found in response');
      setMetrics(metricsData);
    } catch (err) {
      console.error('Error fetching project metrics:', err);
      setError('Failed to load project metrics');
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

  if (error || !metrics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-[var(--text-secondary)] mb-4">{error || 'No metrics available'}</div>
          <button
            onClick={fetchMetrics}
            className="text-[var(--accent-blue)] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const getTimelineIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'mockup_added':
        return <FileImage size={16} className="text-[var(--accent-blue)]" />;
      case 'stage_changed':
        return <Activity size={16} className="text-[var(--accent-purple)]" />;
      case 'comment_added':
        return <MessageSquare size={16} className="text-[var(--accent-green)]" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header with View Project button */}
      <div className="sticky top-0 bg-white border-b border-[var(--border-main)] px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {metrics.projectName}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {metrics.totalMockups} {metrics.totalMockups === 1 ? 'mockup' : 'mockups'}
            </p>
          </div>
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <span>View Full Project</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Progress Summary */}
        <div className="bg-[var(--bg-secondary)] rounded-lg p-5 border border-[var(--border-main)]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={20} className="text-[var(--accent-blue)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">Overall Progress</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-blue)] transition-all duration-500"
                  style={{ width: `${metrics.progressPercentage}%` }}
                />
              </div>
            </div>
            <div className="text-2xl font-bold text-[var(--accent-blue)] min-w-[60px] text-right">
              {metrics.progressPercentage}%
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Based on workflow stage completion
          </p>
        </div>

        {/* Stage Breakdown */}
        {metrics.stageBreakdown.length > 0 && (
          <div className="bg-white rounded-lg p-5 border border-[var(--border-main)]">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={20} className="text-[var(--accent-purple)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Mockups by Stage</h3>
            </div>
            <div className="space-y-3">
              {metrics.stageBreakdown.map((stage) => (
                <div key={stage.stageOrder} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: stage.stageColor }}
                      />
                      <span className="font-medium text-[var(--text-primary)]">
                        {stage.stageName}
                      </span>
                    </div>
                    <span className="text-[var(--text-secondary)]">
                      {stage.mockupCount} {stage.mockupCount === 1 ? 'mockup' : 'mockups'}
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden ml-5">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: metrics.totalMockups > 0
                          ? `${(stage.mockupCount / metrics.totalMockups) * 100}%`
                          : '0%',
                        backgroundColor: stage.stageColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviewer Activity */}
        {metrics.reviewerActivity.length > 0 && (
          <div className="bg-white rounded-lg p-5 border border-[var(--border-main)]">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-[var(--accent-green)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Recent Reviews</h3>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {metrics.reviewerActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {activity.action === 'approved' ? (
                      <CheckCircle size={18} className="text-[var(--accent-green)]" />
                    ) : (
                      <XCircle size={18} className="text-[var(--accent-orange)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {activity.mockupName}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">·</span>
                      <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {activity.stageName}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {activity.action === 'approved' ? 'Approved' : 'Changes requested'} by{' '}
                      <span className="font-medium">{activity.reviewerName}</span>
                    </div>
                    {activity.notes && (
                      <div className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                        "{activity.notes}"
                      </div>
                    )}
                    <div className="text-xs text-[var(--text-tertiary)] mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Timeline */}
        {metrics.timeline.length > 0 && (
          <div className="bg-white rounded-lg p-5 border border-[var(--border-main)]">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={20} className="text-[var(--text-secondary)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Activity Timeline</h3>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {metrics.timeline.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getTimelineIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--text-primary)]">
                      {event.description}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        {event.userName}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">·</span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {metrics.totalMockups === 0 && (
          <div className="text-center py-12">
            <FileImage size={48} className="mx-auto text-[var(--text-tertiary)] mb-3" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No mockups yet
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Add mockups to this project to see metrics and activity
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
