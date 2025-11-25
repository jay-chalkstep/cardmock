'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/hooks/useAuth';
import GmailLayout from '@/components/layout/GmailLayout';
import { Briefcase, CheckCircle, Loader2, ExternalLink, Workflow as WorkflowIcon } from 'lucide-react';
import type { Project, CardMockup, WorkflowStageColor } from '@/lib/supabase';

interface PendingMockup {
  mockup: CardMockup;
  stage_order: number;
  stage_name: string;
  stage_color: WorkflowStageColor;
}

interface ProjectWithPendingMockups {
  project: Project;
  pending_mockups: PendingMockup[];
}

export default function MyStageReviewsPage() {
  const router = useRouter();
  const { organization } = useOrganization();

  const [projects, setProjects] = useState<ProjectWithPendingMockups[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'by_project' | 'by_stage'>('all');

  useEffect(() => {
    if (organization?.id) {
      fetchMyStageReviews();
    }
  }, [organization?.id]);

  const fetchMyStageReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reviews/my-stage-reviews');
      if (!response.ok) throw new Error('Failed to fetch stage reviews');
      const { projects: fetchedProjects } = await response.json();
      setProjects(fetchedProjects || []);
    } catch (error) {
      console.error('Error fetching stage reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Color mapping for workflow stage colors
  const stageColorClasses = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const totalPendingReviews = projects.reduce(
    (sum, p) => sum + p.pending_mockups.length,
    0
  );

  return (
    <GmailLayout>
      <div className="min-h-screen bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-blue-600" />
                My Stage Reviews
              </h1>
              <p className="text-gray-600 mt-2">
                Mockups awaiting your approval at assigned workflow stages
              </p>
            </div>
            {totalPendingReviews > 0 && (
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-semibold">
                {totalPendingReviews} pending {totalPendingReviews === 1 ? 'review' : 'reviews'}
              </div>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('by_project')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'by_project'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              By Project
            </button>
            <button
              onClick={() => setFilter('by_stage')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'by_stage'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              By Stage
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No pending reviews! 🎉
            </h3>
            <p className="text-gray-600">
              You're all caught up. Check back later for new review requests.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {projects.map((projectData) => (
              <div
                key={projectData.project.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Project header */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-3 h-3 rounded-full mt-2"
                        style={{ backgroundColor: projectData.project.color }}
                      />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                          {projectData.project.name}
                          <WorkflowIcon className="h-5 w-5 text-gray-400" />
                        </h2>
                        {projectData.project.client_name && (
                          <p className="text-gray-600 mt-1">
                            {projectData.project.client_name}
                          </p>
                        )}
                        {projectData.project.workflow && (
                          <p className="text-sm text-gray-500 mt-1">
                            Workflow: {projectData.project.workflow.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {projectData.pending_mockups.length}{' '}
                      {projectData.pending_mockups.length === 1 ? 'mockup' : 'mockups'} pending
                    </div>
                  </div>
                </div>

                {/* Mockups grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectData.pending_mockups.map((pendingMockup) => {
                      const stageColorClass =
                        stageColorClasses[pendingMockup.stage_color] || stageColorClasses.gray;

                      return (
                        <div
                          key={pendingMockup.mockup.id}
                          className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                        >
                          {/* Mockup thumbnail */}
                          <div
                            className="relative aspect-[3/2] bg-gray-100 cursor-pointer"
                            onClick={() => router.push(`/mockups/${pendingMockup.mockup.id}`)}
                          >
                            {pendingMockup.mockup.mockup_image_url ? (
                              <img
                                src={pendingMockup.mockup.mockup_image_url}
                                alt={pendingMockup.mockup.mockup_name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Briefcase className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Mockup info */}
                          <div className="p-4">
                            <h3 className="font-medium text-gray-900 truncate mb-2">
                              {pendingMockup.mockup.mockup_name}
                            </h3>

                            {/* Stage badge */}
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border mb-3 ${stageColorClass}`}
                            >
                              <span>Stage {pendingMockup.stage_order}</span>
                              <span>•</span>
                              <span>{pendingMockup.stage_name}</span>
                            </div>

                            {/* Action button */}
                            <button
                              onClick={() => router.push(`/mockups/${pendingMockup.mockup.id}`)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Review Now
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
    )}
    </div>
    </GmailLayout>
  );
}
