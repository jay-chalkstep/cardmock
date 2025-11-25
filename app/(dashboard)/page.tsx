'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';
import { Briefcase, MessageSquare, Plus, Palette, Loader2, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import type { Project } from '@/lib/supabase';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface DashboardStats {
  pendingReviewsCount: number;
  activeProjectsCount: number;
  recentAssetsCount: number;
  recentProjects: Project[];
  pendingReviews: any[];
}

export default function HomePage() {
  const { organization, isLoaded, membership } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const { setActiveNav } = usePanelContext();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    pendingReviewsCount: 0,
    activeProjectsCount: 0,
    recentAssetsCount: 0,
    recentProjects: [],
    pendingReviews: [],
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isAdmin = membership?.role === 'org:admin';

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    setActiveNav('home');
  }, [setActiveNav]);

  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchDashboardData();
    }
  }, [organization?.id, user?.id]);

  const fetchDashboardData = async () => {
    if (!organization?.id || !user?.id) return;

    setLoading(true);
    try {
      // Fetch pending reviews count
      const reviewsResponse = await fetch('/api/reviews/my-stage-reviews');
      const reviewsResult = await reviewsResponse.json();
      const pendingReviews = reviewsResult.success
        ? (reviewsResult.data?.projects || []).flatMap((p: any) => p.pending_mockups || [])
        : [];

      // Fetch projects
      const projectsResponse = await fetch('/api/projects');
      const projectsResult = await projectsResponse.json();
      const projects = projectsResult.data?.projects || projectsResult.projects || [];
      const activeProjects = projects.filter((p: Project) => p.status === 'active');
      const recentProjects = activeProjects.slice(0, 5);

      // Fetch recent assets count (using supabase directly would be better, but for now we'll skip)
      // We can add this later if needed

      setStats({
        pendingReviewsCount: pendingReviews.length,
        activeProjectsCount: activeProjects.length,
        recentAssetsCount: 0, // We'll add this later if needed
        recentProjects,
        pendingReviews: pendingReviews.slice(0, 5),
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GmailLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
        </div>
      </GmailLayout>
    );
  }

  return (
    <>
      <GmailLayout>
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
            </h1>
            <p className="text-[var(--text-secondary)]">
              Here's what's happening with your projects and reviews.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Pending Reviews */}
            <div
              onClick={() => router.push('/my-stage-reviews')}
              className="bg-white rounded-lg shadow-sm border border-[var(--border-main)] p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
                {stats.pendingReviewsCount > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                    {stats.pendingReviewsCount}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                Pending Reviews
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {stats.pendingReviewsCount === 0
                  ? 'No pending reviews'
                  : `${stats.pendingReviewsCount} item${stats.pendingReviewsCount !== 1 ? 's' : ''} need your attention`}
              </p>
              <button className="text-sm text-[var(--accent-blue)] hover:underline flex items-center gap-1">
                View Reviews <ArrowRight size={14} />
              </button>
            </div>

            {/* Active Projects */}
            <div
              onClick={() => router.push('/projects')}
              className="bg-white rounded-lg shadow-sm border border-[var(--border-main)] p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                Active Projects
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {stats.activeProjectsCount === 0
                  ? 'No active projects'
                  : `${stats.activeProjectsCount} active project${stats.activeProjectsCount !== 1 ? 's' : ''}`}
              </p>
              <button className="text-sm text-[var(--accent-blue)] hover:underline flex items-center gap-1">
                View Projects <ArrowRight size={14} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-[var(--border-main)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Plus className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/projects')}
                  className="w-full text-left px-3 py-2 text-sm bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Briefcase size={16} />
                  <span>New Project</span>
                </button>
                <button
                  onClick={() => router.push('/designer')}
                  className="w-full text-left px-3 py-2 text-sm bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Palette size={16} />
                  <span>Create Asset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Projects */}
            <div className="bg-white rounded-lg shadow-sm border border-[var(--border-main)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Recent Projects
                </h2>
                <button
                  onClick={() => router.push('/projects')}
                  className="text-sm text-[var(--accent-blue)] hover:underline"
                >
                  View All
                </button>
              </div>
              {stats.recentProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)] mb-4">No projects yet</p>
                  <button
                    onClick={() => router.push('/projects')}
                    className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Create Project
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="p-4 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: project.color || '#3B82F6' }}
                          />
                          <div>
                            <h3 className="font-medium text-[var(--text-primary)]">
                              {project.name}
                            </h3>
                            {project.client_name && (
                              <p className="text-sm text-[var(--text-secondary)]">
                                {project.client_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-[var(--text-tertiary)]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Reviews */}
            <div className="bg-white rounded-lg shadow-sm border border-[var(--border-main)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Pending Reviews
                </h2>
                {stats.pendingReviewsCount > 0 && (
                  <button
                    onClick={() => router.push('/my-stage-reviews')}
                    className="text-sm text-[var(--accent-blue)] hover:underline"
                  >
                    View All
                  </button>
                )}
              </div>
              {stats.pendingReviewsCount === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">All caught up!</p>
                  <p className="text-sm text-[var(--text-tertiary)] mt-1">
                    No pending reviews at this time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.pendingReviews.map((review: any, index: number) => (
                    <div
                      key={index}
                      onClick={() => router.push('/my-stage-reviews')}
                      className="p-4 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <div>
                            <h3 className="font-medium text-[var(--text-primary)]">
                              {review.mockup?.mockup_name || 'Unnamed Asset'}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {review.stage_name || 'Review needed'}
                            </p>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-[var(--text-tertiary)]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </GmailLayout>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}

