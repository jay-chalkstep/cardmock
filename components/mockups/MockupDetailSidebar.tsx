/**
 * Mockup Detail Sidebar Component
 * Contains mockup info, approval status, annotation tools, and action buttons
 */

import { Calendar, Loader2, Sparkles, Download, Trash2 } from 'lucide-react';
import AnnotationToolbar from '@/components/collaboration/AnnotationToolbar';
import ApprovalStatusBanner from '@/components/approvals/ApprovalStatusBanner';
import FinalApprovalBanner from '@/components/approvals/FinalApprovalBanner';
import type { CardMockup, MockupStageProgressWithDetails, Project, Workflow, AssetApprovalSummary } from '@/lib/supabase';
import type { AnnotationTool } from '@/app/(dashboard)/mockups/[id]/page';

interface MockupDetailSidebarProps {
  mockup: CardMockup;
  currentStageProgress?: MockupStageProgressWithDetails | null;
  workflow?: Workflow | null;
  project?: Project | null;
  approvalSummary?: AssetApprovalSummary | null;
  isCurrentUserReviewer: boolean;
  hasCurrentUserApproved: boolean;
  currentUserId: string;
  // Annotation tools
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  strokeColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  // Actions
  analyzing: boolean;
  onAnalyzeWithAI: () => void;
  showExportMenu: boolean;
  onToggleExportMenu: () => void;
  onExport: (includeAnnotations: boolean) => void;
  isCreator: boolean;
  onDelete: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
  onFinalApprove: () => void;
  isProcessingApproval: boolean;
}

export default function MockupDetailSidebar({
  mockup,
  currentStageProgress,
  workflow,
  project,
  approvalSummary,
  isCurrentUserReviewer,
  hasCurrentUserApproved,
  currentUserId,
  activeTool,
  onToolChange,
  strokeColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  analyzing,
  onAnalyzeWithAI,
  showExportMenu,
  onToggleExportMenu,
  onExport,
  isCreator,
  onDelete,
  onApprove,
  onRequestChanges,
  onFinalApprove,
  isProcessingApproval,
}: MockupDetailSidebarProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Top Section - Info */}
      <div className="p-4 space-y-4">
        {/* Mockup Info */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {mockup.mockup_name}
          </h2>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Calendar className="h-3 w-3" />
            {new Date(mockup.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Approval Status - Show FinalApprovalBanner if pending final approval */}
        {currentStageProgress?.status === 'pending_final_approval' && workflow && project && mockup && (
          <FinalApprovalBanner
            mockupName={mockup.mockup_name}
            projectName={project.name}
            totalStages={workflow.stages?.length || 0}
            onFinalApprove={onFinalApprove}
            isProcessing={isProcessingApproval}
          />
        )}

        {/* Approval Status Banner - Show if in review and has approval data */}
        {currentStageProgress?.status === 'in_review' && approvalSummary && workflow && (
          <ApprovalStatusBanner
            stageProgress={approvalSummary.progress_summary[currentStageProgress.stage_order] || {
              stage_order: currentStageProgress.stage_order,
              stage_name: currentStageProgress.stage_name,
              stage_color: currentStageProgress.stage_color,
              approvals_required: currentStageProgress.approvals_required || 0,
              approvals_received: currentStageProgress.approvals_received || 0,
              is_complete: false,
              user_approvals: []
            }}
            currentUserId={currentUserId}
            isCurrentUserReviewer={isCurrentUserReviewer}
            hasCurrentUserApproved={hasCurrentUserApproved}
            onApprove={onApprove}
            onRequestChanges={onRequestChanges}
            isProcessing={isProcessingApproval}
          />
        )}

        {/* Fallback Stage Info (for other statuses) */}
        {currentStageProgress && workflow && project &&
         currentStageProgress.status !== 'in_review' &&
         currentStageProgress.status !== 'pending_final_approval' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="text-xs font-semibold text-blue-900">
              Stage: {currentStageProgress.stage_name || `Stage ${currentStageProgress.stage_order}`}
            </div>
            <div className="text-xs text-blue-700">
              Status: {currentStageProgress.status}
            </div>
            <div className="text-xs text-blue-600">
              Project: {project.name}
            </div>
            {currentStageProgress.notes && (
              <div className="text-xs text-blue-800 pt-2 border-t border-blue-200">
                <strong>Notes:</strong> {currentStageProgress.notes}
              </div>
            )}
          </div>
        )}

        {/* Annotation Toolbar */}
        <div className="pt-4 border-t border-[var(--border-main)]">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Annotation Tools
          </h3>
          <AnnotationToolbar
            activeTool={activeTool}
            onToolChange={onToolChange}
            strokeColor={strokeColor}
            onColorChange={onColorChange}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={onStrokeWidthChange}
            scale={scale}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onZoomReset={onZoomReset}
          />
        </div>
      </div>

      {/* Bottom Section - Action Buttons */}
      <div className="mt-auto p-4 space-y-2 border-t border-[var(--border-main)] bg-[var(--bg-secondary)]">
        <button
          onClick={onAnalyzeWithAI}
          disabled={analyzing}
          className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          data-tour="analyze-button"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Analyze with AI
            </>
          )}
        </button>

        {/* Export Menu */}
        <div className="relative">
          <button
            onClick={onToggleExportMenu}
            className="w-full px-3 py-2 bg-white border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          {showExportMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={onToggleExportMenu}
              />
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[var(--border-main)] rounded-lg shadow-lg z-20">
                <button
                  onClick={() => {
                    onExport(false);
                    onToggleExportMenu();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors first:rounded-t-lg"
                >
                  Export Image
                </button>
                <button
                  onClick={() => {
                    onExport(true);
                    onToggleExportMenu();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors last:rounded-b-lg"
                >
                  Export with Annotations
                </button>
              </div>
            </>
          )}
        </div>

        {isCreator && (
          <button
            onClick={onDelete}
            className="w-full px-3 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

