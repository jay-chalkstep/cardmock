'use client';

import { useState, useEffect, use } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { supabase, CardMockup } from '@/lib/supabase';
import {
  Loader2
} from 'lucide-react';
import Toast from '@/components/Toast';
import MockupCanvas from '@/components/collaboration/MockupCanvas';
import StageActionModal from '@/components/projects/StageActionModal';
import GmailLayout from '@/components/layout/GmailLayout';
import PreviewArea from '@/components/preview/PreviewArea';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import MockupDetailSidebar from '@/components/mockups/MockupDetailSidebar';
import MockupDetailPreviewPanel from '@/components/mockups/MockupDetailPreviewPanel';
import type { MockupStageProgressWithDetails, Project, Workflow, AssetApprovalSummary, ApprovalProgress } from '@/lib/supabase';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export interface Comment {
  id: string;
  mockup_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  comment_text: string;
  annotation_data?: any; // Konva shape JSON
  position_x?: number;
  position_y?: number;
  annotation_type?: string;
  annotation_color?: string;
  is_resolved: boolean;
  parent_comment_id?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  // Audit trail fields
  resolved_by?: string;
  resolved_by_name?: string;
  resolved_at?: string;
  resolution_note?: string;
  deleted_at?: string;
  deleted_by?: string;
  deleted_by_name?: string;
  edit_history?: Array<{
    edited_at: string;
    edited_by: string;
    edited_by_name: string;
    old_text: string;
    new_text: string;
  }>;
  original_comment_text?: string;
}

export type AnnotationTool = 'select' | 'pin' | 'arrow' | 'circle' | 'rect' | 'freehand' | 'text';

export default function MockupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { user } = useUser();
  const { setActiveNav } = usePanelContext();

  // Core data
  const [mockup, setMockup] = useState<CardMockup | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // Annotation tool state
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  const [strokeColor, setStrokeColor] = useState('#22C55E'); // Green default
  const [strokeWidth, setStrokeWidth] = useState(8); // 8px default

  // Zoom state
  const [scale, setScale] = useState(1.0);

  // Hover state for linking annotations to comments
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);

  // Modal state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showStageActionModal, setShowStageActionModal] = useState(false);

  // Stage progress state
  const [stageProgress, setStageProgress] = useState<MockupStageProgressWithDetails[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Right panel tab state
  const [rightPanelTab, setRightPanelTab] = useState<'comments' | 'approvals'>('comments');

  // Approval state
  const [approvalSummary, setApprovalSummary] = useState<AssetApprovalSummary | null>(null);
  const [isCurrentUserReviewer, setIsCurrentUserReviewer] = useState(false);
  const [hasCurrentUserApproved, setHasCurrentUserApproved] = useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  
  // Reviewer status for annotation permissions
  const [isReviewer, setIsReviewer] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Zoom handlers
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 4.0;
  const SCALE_STEP = 0.25;

  const handleZoomIn = () => {
    setScale(prevScale => Math.min(prevScale + SCALE_STEP, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setScale(prevScale => Math.max(prevScale - SCALE_STEP, MIN_SCALE));
  };

  const handleZoomReset = () => {
    setScale(1.0);
  };

  // Check if current user is the creator
  const isCreator = mockup?.created_by === user?.id;
  
  // User can annotate if they're creator OR reviewer
  const canAnnotate = isCreator || isReviewer;

  // Stage workflow computed values
  const currentStageProgress = stageProgress.find(p => p.status === 'in_review');
  const isStageReviewer = currentStageProgress && project
    ? // Check if user is assigned as reviewer for current stage
      false // TODO: fetch stage reviewers and check
    : false;

  useEffect(() => {
    setActiveNav('mockups');
  }, [setActiveNav]);

  useEffect(() => {
    if (orgLoaded && organization?.id && user?.id) {
      fetchMockupData();
      fetchComments();
      fetchStageProgress();
      fetchApprovals();
      // Note: Realtime subscriptions removed due to RLS blocking with Clerk Auth
      // Using polling fallback instead
    }
  }, [id, orgLoaded, organization?.id, user?.id]);

  const fetchMockupData = async () => {
    console.log(`\n=== FETCH MOCKUP DATA (ID: ${id}) ===`);
    console.log('Organization ID:', organization?.id);
    console.log('User ID:', user?.id);

    try {
      setLoading(true);
      console.log('Querying assets table...');

      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          logo:logo_variants(*),
          template:templates(*)
        `)
        .eq('id', id)
        .eq('organization_id', organization?.id)
        .single();

      console.log('Query result:', { hasData: !!data, error: error?.message });

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      if (!data) {
        console.error('❌ No data returned');
        showToast('Mockup not found', 'error');
        router.push('/gallery');
        return;
      }

      console.log('✅ Mockup data:', {
        id: data.id,
        mockup_name: data.mockup_name,
        hasLogo: !!data.logo,
        hasTemplate: !!data.template,
        mockup_image_url: data.mockup_image_url,
      });

      setMockup(data);
      
      // Check if user is a reviewer for this mockup's project
      // Reviewers are assigned at the project level via project_stage_reviewers
      // Only check if user is not the creator and mockup has a project
      if (user?.id && data.created_by !== user.id && data.project_id) {
        try {
          const { data: reviewerData, error: reviewerError } = await supabase
            .from('project_stage_reviewers')
            .select('id')
            .eq('project_id', data.project_id)
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          
          if (reviewerError) {
            console.error('Error checking reviewer status:', reviewerError);
            setIsReviewer(false);
          } else {
            setIsReviewer(!!reviewerData);
          }
        } catch (error) {
          console.error('Error checking reviewer status:', error);
          setIsReviewer(false);
        }
      } else {
        // If user is creator or mockup has no project, they're not a reviewer
        setIsReviewer(false);
      }
      
      console.log('=== END FETCH MOCKUP DATA ===\n');
    } catch (error) {
      console.error('❌ Error fetching mockup:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error details:', error);
      showToast('Failed to load mockup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    console.log(`\n=== FETCH COMMENTS (ID: ${id}) ===`);

    try {
      const url = `/api/mockups/${id}/comments`;
      console.log('Fetching from:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('❌ Response not OK');
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }

      const result = await response.json();
      const comments = result.data?.comments || result.comments || [];
      console.log('✅ Comments fetched:', comments?.length || 0);
      setComments(comments);
      console.log('=== END FETCH COMMENTS ===\n');
    } catch (error) {
      console.error('❌ Error fetching comments:', error);
      console.error('Error details:', error);
    }
  };

  const fetchStageProgress = async () => {
    console.log(`\n=== FETCH STAGE PROGRESS (ID: ${id}) ===`);

    try {
      const url = `/api/mockups/${id}/stage-progress`;
      console.log('Fetching from:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('❌ Response not OK');
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch stage progress: ${response.status}`);
      }

      const { progress, workflow: workflowData } = await response.json();
      console.log('✅ Stage progress fetched:', progress?.length || 0, 'stages');
      console.log('Workflow:', workflowData ? workflowData.workflow_name : 'none');

      setStageProgress(progress || []);
      setWorkflow(workflowData || null);

      // If mockup has project_id, fetch project data
      if (mockup?.project_id) {
        console.log('Fetching project data:', mockup.project_id);
        const projectUrl = `/api/projects/${mockup.project_id}`;
        const projectResponse = await fetch(projectUrl);
        console.log('Project response status:', projectResponse.status);

        if (projectResponse.ok) {
          const { project: projectData } = await projectResponse.json();
          console.log('✅ Project fetched:', projectData?.project_name);
          setProject(projectData);
        } else {
          console.error('❌ Project fetch failed:', projectResponse.status);
        }
      }

      console.log('=== END FETCH STAGE PROGRESS ===\n');
    } catch (error) {
      console.error('❌ Error fetching stage progress:', error);
      console.error('Error details:', error);
    }
  };

  const fetchApprovals = async () => {
    console.log(`\n=== FETCH APPROVALS (ID: ${id}) ===`);

    try {
      const url = `/api/mockups/${id}/approvals`;
      console.log('Fetching from:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('❌ Response not OK');
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch approvals: ${response.status}`);
      }

      const data: AssetApprovalSummary = await response.json();

      // Count total approvals across all stages
      const totalApprovals = Object.values(data.approvals_by_stage || {})
        .reduce((sum, stageApprovals) => sum + stageApprovals.length, 0);

      console.log('✅ Approvals fetched:', {
        totalApprovals,
        stages: Object.keys(data.approvals_by_stage || {}).length,
        hasFinalApproval: !!data.final_approval,
      });

      setApprovalSummary(data);

      // Check if current user is reviewer for current stage
      if (currentStageProgress && user?.id) {
        const currentStageApprovals = data.approvals_by_stage[currentStageProgress.stage_order] || [];
        const userApproval = currentStageApprovals.find(a => a.user_id === user.id);
        setHasCurrentUserApproved(!!userApproval && userApproval.action === 'approve');

        // Check if user is assigned reviewer by checking if they have any progress entry
        const progressForStage = data.progress_summary[currentStageProgress.stage_order];
        setIsCurrentUserReviewer(progressForStage?.approvals_required > 0);
        console.log('Current user reviewer status:', {
          isReviewer: progressForStage?.approvals_required > 0,
          hasApproved: !!userApproval && userApproval.action === 'approve',
        });
      }

      console.log('=== END FETCH APPROVALS ===\n');
    } catch (error) {
      console.error('❌ Error fetching approvals:', error);
      console.error('Error details:', error);
    }
  };

  // Comment creation handler - refetches to update UI
  const handleCommentCreate = async () => {
    // Refetch comments after creation to show new comment immediately
    await fetchComments();
  };

  const handleApprove = async () => {
    if (!currentStageProgress) return;

    setIsProcessingApproval(true);
    try {
      const response = await fetch(`/api/mockups/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve');
      }

      const { message } = await response.json();
      showToast(message, 'success');

      // Refetch all data
      await Promise.all([
        fetchStageProgress(),
        fetchApprovals()
      ]);
    } catch (error) {
      console.error('Error approving:', error);
      showToast(error instanceof Error ? error.message : 'Failed to approve', 'error');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleRequestChanges = () => {
    // Open the existing StageActionModal for request changes
    setShowStageActionModal(true);
  };

  const handleFinalApprove = async (notes?: string) => {
    setIsProcessingApproval(true);
    try {
      const response = await fetch(`/api/mockups/${id}/final-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || '' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to give final approval');
      }

      showToast('Final approval recorded successfully!', 'success');

      // Refetch all data
      await Promise.all([
        fetchMockupData(),
        fetchStageProgress(),
        fetchApprovals()
      ]);
    } catch (error) {
      console.error('Error giving final approval:', error);
      showToast(error instanceof Error ? error.message : 'Failed to give final approval', 'error');
    } finally {
      setIsProcessingApproval(false);
    }
  };


  const handleDeleteMockup = async () => {
    if (!confirm('Are you sure you want to delete this mockup? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/mockups/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete mockup');

      showToast('Mockup deleted successfully', 'success');
      router.push('/gallery');
    } catch (error) {
      console.error('Error deleting mockup:', error);
      showToast('Failed to delete mockup', 'error');
    }
  };

  const handleExport = async (includeAnnotations: boolean) => {
    // This will be triggered from MockupCanvas component
    // The canvas component will handle the actual export
    const event = new CustomEvent('export-mockup', {
      detail: { includeAnnotations }
    });
    window.dispatchEvent(event);
    setShowExportMenu(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!mockup) {
    return null;
  }

  // Context Panel - Use MockupDetailSidebar component
  const contextPanelContent = (
    <MockupDetailSidebar
      mockup={mockup}
      currentStageProgress={currentStageProgress}
      workflow={workflow}
      project={project}
      approvalSummary={approvalSummary}
      isCurrentUserReviewer={isCurrentUserReviewer}
      hasCurrentUserApproved={hasCurrentUserApproved}
      currentUserId={user?.id || ''}
      activeTool={activeTool}
      onToolChange={setActiveTool}
      strokeColor={strokeColor}
      onColorChange={setStrokeColor}
      strokeWidth={strokeWidth}
      onStrokeWidthChange={setStrokeWidth}
      scale={scale}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onZoomReset={handleZoomReset}
      showExportMenu={showExportMenu}
      onToggleExportMenu={() => setShowExportMenu(!showExportMenu)}
      onExport={handleExport}
      isCreator={isCreator}
      canAnnotate={canAnnotate}
      onDelete={handleDeleteMockup}
      onApprove={handleApprove}
      onRequestChanges={handleRequestChanges}
      onFinalApprove={handleFinalApprove}
      isProcessingApproval={isProcessingApproval}
    />
  );

  // Center Panel - Mockup Canvas
  const canvasContent = (
    <div className="h-full bg-gray-100 overflow-auto">
      <MockupCanvas
        mockup={mockup}
        comments={comments}
        activeTool={activeTool}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        scale={scale}
        onScaleChange={setScale}
        onCommentCreate={handleCommentCreate}
        onCommentHover={setHoveredCommentId}
        hoveredCommentId={hoveredCommentId}
        isCreator={isCreator}
        canAnnotate={canAnnotate}
      />
    </div>
  );

  // Preview Panel - Use MockupDetailPreviewPanel component
  const previewContent = (
    <MockupDetailPreviewPanel
      mockupId={id}
      comments={comments}
      currentUserId={user?.id || ''}
      isCreator={isCreator}
      onCommentUpdate={fetchComments}
      onCommentHover={setHoveredCommentId}
      hoveredCommentId={hoveredCommentId}
      approvalSummary={approvalSummary}
      workflow={workflow}
      rightPanelTab={rightPanelTab}
      onTabChange={setRightPanelTab}
    />
  );

  return (
    <>
      <GmailLayout
        contextPanel={contextPanelContent}
        listView={canvasContent}
        previewArea={<PreviewArea>{previewContent}</PreviewArea>}
        listViewWidth="flex"
        previewWidth="fixed"
      />

      {/* Modals */}
      {/* Stage Action Modal */}
      {showStageActionModal && currentStageProgress && workflow && project && mockup && (
        <StageActionModal
          mockup={mockup}
          project={project}
          stageOrder={currentStageProgress.stage_order}
          stageName={currentStageProgress.stage_name || `Stage ${currentStageProgress.stage_order}`}
          stageColor={currentStageProgress.stage_color || 'blue'}
          onClose={() => setShowStageActionModal(false)}
          onActionComplete={() => {
            fetchStageProgress();
            setShowStageActionModal(false);
            showToast('Stage action completed successfully', 'success');
          }}
        />
      )}


      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
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
