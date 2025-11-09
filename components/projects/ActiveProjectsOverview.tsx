'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Briefcase,
  FileImage,
  TrendingUp,
  CheckCircle,
  Activity,
  Users,
  XCircle,
  MessageSquare,
  AlertCircle,
  Award,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ProjectStatus } from '@/lib/supabase';

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

interface AggregatedMetrics {
  totalProjects: number;
  totalMockups: number;
  overallProgress: number;
  pendingReviews: number;
  stageBreakdown: StageBreakdownItem[];
  myRecentActivity: MyRecentActivity[];
  timeline: TimelineEvent[];
  projectHealth: {
    needsAttention: ProjectHealthItem[];
    nearCompletion: ProjectHealthItem[];
  };
}

interface ActiveProjectsOverviewProps {
  statusFilter?: ProjectStatus | 'all';
}

export default function ActiveProjectsOverview({ statusFilter = 'active' }: ActiveProjectsOverviewProps) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [statusFilter]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/metrics?status=${statusFilter}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const result = await response.json();
      const metricsData = result.data?.metrics || result.metrics;
      if (!metricsData) throw new Error('Metrics not found in response');
      setMetrics(metricsData);
    } catch (err) {
      console.error('Error fetching aggregated metrics:', err);
      setError('Failed to load metrics');
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

  const statusTitle = statusFilter === 'all' ? 'All Projects' : statusFilter === 'active' ? 'Active Projects' : statusFilter === 'completed' ? 'Completed Projects' : 'Archived Projects';

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-[var(--border-main)] px-6 py-4 z-10">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Projects Overview
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Aggregated metrics across all of your projects
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-[var(--border-main)]">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase size={18} className="text-[var(--accent-blue)]" />
              <span className="text-xs text-[var(--text-secondary)]">Projects</span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {metrics.totalProjects}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-[var(--border-main)]">
            <div className="flex items-center gap-2 mb-2">
              <FileImage size={18} className="text-[var(--accent-purple)]" />
              <span className="text-xs text-[var(--text-secondary)]">Mockups</span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {metrics.totalMockups}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-[var(--border-main)]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-[var(--accent-green)]" />
              <span className="text-xs text-[var(--text-secondary)]">Progress</span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {metrics.overallProgress}%
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-[var(--border-main)]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="text-[var(--accent-orange)]" />
              <span className="text-xs text-[var(--text-secondary)]">Pending Reviews</span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {metrics.pendingReviews}
            </div>
          </div>
        </div>

        {/* Stage Breakdown */}
        {metrics.stageBreakdown.length > 0 && (
          <div className="bg-white rounded-lg p-5 border border-[var(--border-main)]">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={20} className="text-[var(--accent-purple)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">
                Mockups by Stage Across All Projects
              </h3>
            </div>
            <div className="space-y-3">
              {metrics.stageBreakdown.map((stage, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: stage.stageColor }}
                      />
                      <span className="font-medium text-[var(--text-primary)]">
                        {stage.stageName}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        ({stage.projectCount} {stage.projectCount === 1 ? 'project' : 'projects'})
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

        {/* Project Health */}
        {(metrics.projectHealth.needsAttention.length > 0 || metrics.projectHealth.nearCompletion.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {/* Needs Attention */}
            {metrics.projectHealth.needsAttention.length > 0 && (
              <div className="bg-white rounded-lg p-5 border border-[var(--border-main)]">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={20} className="text-[var(--accent-orange)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">Needs Attention</h3>
                </div>
                <div className="space-y-2">
                  {metrics.projectHealth.needsAttention.map((item) => (
                    <button
                      key={item.projectId}
                      onClick={() => router.push(`/projects/${item.projectId}`)}
                      className="w-full text-left p-3 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate">
                        {item.projectName}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        {item.reason}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Near Completion */}
            {metrics.projectHealth.nearCompletion.length > 0 && (
              <div className="bg-white rounded-lg p-5 border border-[var(--border-main)]">
                <div className="flex items-center gap-2 mb-3">
                  <Award size={20} className="text-[var(--accent-green)]" />
                  <h3 className="font-semibold text-[var(--text-primary)]">Near Completion</h3>
                </div>
                <div className="space-y-2">
                  {metrics.projectHealth.nearCompletion.map((item) => (
                    <button
                      key={item.projectId}
                      onClick={() => router.push(`/projects/${item.projectId}`)}
                      className="w-full text-left p-3 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm text-[var(--text-primary)] truncate">
                          {item.projectName}
                        </div>
                        <div className="text-xs font-semibold text-[var(--accent-green)]">
                          {item.progress}%
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Recent Activity */}
        {metrics.myRecentActivity.length > 0 && (
          <div className="bg-white rounded-lg p-5 border border-[var(--border-main)]">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-[var(--accent-green)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">My Recent Reviews</h3>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {metrics.myRecentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  onClick={() => router.push(`/projects/${activity.projectId}`)}
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
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: activity.projectColor }}
                      />
                      <span className="text-xs text-[var(--text-secondary)] truncate">
                        {activity.projectName}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate mb-1">
                      {activity.mockupName}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {activity.action === 'approved' ? 'Approved' : 'Requested changes'} at {activity.stageName}
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

        {/* Timeline */}
        {metrics.timeline.length > 0 && (
          <div className="bg-white rounded-lg p-5 border border-[var(--border-main)]">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={20} className="text-[var(--text-secondary)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Recent Activity Across Projects</h3>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {metrics.timeline.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors cursor-pointer"
                  onClick={() => router.push(`/projects/${event.projectId}`)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getTimelineIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.projectColor }}
                      />
                      <span className="text-xs font-medium text-[var(--text-secondary)] truncate">
                        {event.projectName}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--text-primary)]">
                      {event.description}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--text-secondary)]">
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
        {metrics.totalProjects === 0 && (
          <div className="text-center py-12">
            <Briefcase size={48} className="mx-auto text-[var(--text-tertiary)] mb-3 opacity-30" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No {statusFilter} projects
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Create a new project to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
