'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  Search,
  Plus,
  Settings,
  Palette,
} from 'lucide-react';
import type { Project, MockupWithProgress } from '@/lib/supabase';
import Toast from '@/components/Toast';
import GmailLayout from '@/components/layout/GmailLayout';
import WorkflowBoard from '@/components/projects/WorkflowBoard';
import ProjectStageReviewers from '@/components/projects/ProjectStageReviewers';
import EditProjectModal from '@/components/projects/EditProjectModal';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { organization } = useOrganization();
  const projectId = params.id as string;

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [mockups, setMockups] = useState<MockupWithProgress[]>([]);
  const [stageReviewers, setStageReviewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleUpdateProject = async (projectData: {
    name: string;
    client_name?: string;
    description?: string;
    status?: 'active' | 'completed' | 'archived';
    color?: string;
    workflow_id?: string | null;
  }) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update project');
      }

      showToast('Project updated successfully', 'success');
      await fetchProjectAndMockups();
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (organization?.id && projectId) {
      fetchProjectAndMockups();
    }
  }, [organization?.id, projectId]);

  const fetchProjectAndMockups = async () => {
    if (!organization?.id || !projectId) return;

    setLoading(true);
    try {
      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      if (!projectResponse.ok) throw new Error('Failed to fetch project');
      const result = await projectResponse.json();
      const fetchedProject = result.data?.project || result.project;
      if (!fetchedProject) throw new Error('Project not found in response');
      setProject(fetchedProject);

      // Fetch project mockups
      const mockupsResponse = await fetch(`/api/projects/${projectId}/mockups`);
      if (!mockupsResponse.ok) throw new Error('Failed to fetch mockups');
      const mockupsResult = await mockupsResponse.json();
      const fetchedMockups = mockupsResult.data?.mockups || mockupsResult.mockups || [];
      setMockups(fetchedMockups);

      // Fetch stage reviewers
      const reviewersResponse = await fetch(`/api/projects/${projectId}/reviewers`);
      if (reviewersResponse.ok) {
        const reviewersResult = await reviewersResponse.json();
        const fetchedReviewers = reviewersResult.data?.reviewers || reviewersResult.reviewers || [];
        setStageReviewers(fetchedReviewers);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      showToast('Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  };

  if (loading) {
    return (
      <GmailLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </GmailLayout>
    );
  }

  if (!project) {
    return (
      <GmailLayout>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <Briefcase className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Project not found</h2>
          <button
            onClick={() => router.push('/projects')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </button>
        </div>
      </GmailLayout>
    );
  }

  // Calculate aggregate progress stats
  const progressStats = mockups.reduce(
    (acc, mockup) => {
      if (!mockup.overall_status) return acc;
      switch (mockup.overall_status) {
        case 'in_progress':
          acc.inReview++;
          break;
        case 'approved':
          acc.approved++;
          break;
        case 'changes_requested':
          acc.changes++;
          break;
        default:
          acc.notStarted++;
      }
      return acc;
    },
    { inReview: 0, approved: 0, changes: 0, notStarted: 0 }
  );

  const formatCompactDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Context Panel Content - Stage Reviewers
  const contextPanelContent = project?.workflow ? (
    <div className="p-4">
      <ProjectStageReviewers
        projectId={projectId}
        projectName={project.name}
        workflow={project.workflow}
        onUpdate={fetchProjectAndMockups}
      />
    </div>
  ) : null;

  return (
    <GmailLayout contextPanel={contextPanelContent}>
      <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Compact back button */}
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Projects
          </button>

          {/* Line 1: Project identity + stats */}
          <div className="flex items-center justify-between mb-2 gap-4">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {/* Color dot + Name + Client */}
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <h1 className="text-xl font-bold text-gray-900 truncate">{project.name}</h1>
                {project.client_name && (
                  <span className="text-gray-500 text-sm truncate">• {project.client_name}</span>
                )}
                {project.contract && (
                  <span 
                    className="text-blue-600 text-sm truncate cursor-pointer hover:underline"
                    onClick={() => project.contract && router.push(`/contracts/${project.contract.id}`)}
                  >
                    • Contract: {project.contract.contract_number}
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="h-4 w-px bg-gray-300 flex-shrink-0" />

              {/* Workflow badge */}
              {project.workflow && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded border border-purple-300 flex-shrink-0">
                  {project.workflow.name}
                </span>
              )}

              {/* Status */}
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                  statusColors[project.status]
                }`}
              >
                {statusLabels[project.status]}
              </span>

              {/* Progress stats */}
              {project.workflow && mockups.length > 0 && (
                <>
                  {progressStats.inReview > 0 && (
                    <span className="text-xs text-gray-600 flex-shrink-0">
                      {progressStats.inReview} in review
                    </span>
                  )}
                  {progressStats.approved > 0 && (
                    <span className="text-xs text-gray-600 flex-shrink-0">
                      • {progressStats.approved} approved
                    </span>
                  )}
                  {progressStats.changes > 0 && (
                    <span className="text-xs text-red-600 flex-shrink-0">
                      • {progressStats.changes} changes
                    </span>
                  )}
                </>
              )}

              {/* Mockup count + Date */}
              <span className="text-xs text-gray-500 flex-shrink-0">
                • {project.mockup_count || 0} {project.mockup_count === 1 ? 'mockup' : 'mockups'}
              </span>
              <span className="text-xs text-gray-500 flex-shrink-0">
                • {formatCompactDate(project.created_at)}
              </span>
            </div>
          </div>

          {/* Line 2: Description + Search */}
          <div className="flex items-center gap-4">
            {project.description && (
              <p className="text-sm text-gray-600 truncate flex-1 min-w-0">
                {project.description}
              </p>
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="text-xs text-gray-500 whitespace-nowrap">
                Filter or add:
              </label>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search project mockups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                title="Edit project settings"
              >
                <Settings size={16} />
                <span>Settings</span>
              </button>
              <button
                onClick={() => router.push(`/designer?projectId=${projectId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title="Create a new asset for this project"
              >
                <Palette size={16} />
                <span>Create Asset</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Workflow Board - show if project has workflow */}
        {project?.workflow && mockups.length > 0 && (
          <WorkflowBoard
            workflow={project.workflow}
            mockups={mockups}
            stageReviewers={stageReviewers}
            onRefresh={fetchProjectAndMockups}
          />
        )}

        {/* Simple grid for projects without workflow but with mockups */}
        {!project?.workflow && mockups.length > 0 && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                This project doesn't have a workflow assigned. Assets are displayed in a simple grid.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {mockups.map((mockup) => (
                <div
                  key={mockup.id}
                  onClick={() => router.push(`/mockups/${mockup.id}`)}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                >
                  {mockup.mockup_image_url && (
                    <div className="aspect-video bg-gray-100 relative">
                      <img
                        src={mockup.mockup_image_url}
                        alt={mockup.mockup_name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 truncate mb-1">
                      {mockup.mockup_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {formatCompactDate(mockup.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state if no mockups */}
        {mockups.length === 0 && (
          <div className="text-center py-16">
            <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No assets in this project yet
            </h3>
            <p className="text-gray-600 mb-4">
              Assign assets to this project from the Gallery or create new ones in the Designer
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push('/gallery')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Gallery
              </button>
              <button
                onClick={() => router.push('/designer')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Create New Asset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast notifications */}
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

      {/* Edit Project Modal */}
      {project && showEditModal && (
        <EditProjectModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          project={project}
          onSubmit={handleUpdateProject}
        />
      )}
    </div>
    </GmailLayout>
  );
}
