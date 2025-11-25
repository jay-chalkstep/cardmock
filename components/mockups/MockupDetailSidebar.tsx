/**
 * Mockup Detail Sidebar Component
 * Contains mockup info, simple status, annotation tools, and action buttons
 */

import { Calendar, Download, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import AnnotationToolbar from '@/components/collaboration/AnnotationToolbar';
import type { CardMockup, MockupStageProgressWithDetails, Project, Workflow } from '@/lib/supabase';
import type { AnnotationTool } from '@/app/(dashboard)/mockups/[id]/page';

interface MockupDetailSidebarProps {
  mockup: CardMockup;
  currentStageProgress?: MockupStageProgressWithDetails | null;
  workflow?: Workflow | null;
  project?: Project | null;
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
  showExportMenu: boolean;
  onToggleExportMenu: () => void;
  onExport: (includeAnnotations: boolean) => void;
  isCreator: boolean;
  canAnnotate: boolean;
  onDelete: () => void;
}

// Simple status badge component
function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    'approved': {
      icon: <CheckCircle className="h-4 w-4" />,
      label: 'Approved',
      className: 'bg-green-50 text-green-700 border-green-200',
    },
    'in_review': {
      icon: <Clock className="h-4 w-4" />,
      label: 'In Review',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    'pending_final_approval': {
      icon: <Clock className="h-4 w-4" />,
      label: 'Pending Final Approval',
      className: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    'changes_requested': {
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Changes Requested',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    'draft': {
      icon: <Clock className="h-4 w-4" />,
      label: 'Draft',
      className: 'bg-gray-50 text-gray-700 border-gray-200',
    },
  };

  const config = statusConfig[status] || statusConfig['draft'];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </div>
  );
}

export default function MockupDetailSidebar({
  mockup,
  currentStageProgress,
  project,
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
  showExportMenu,
  onToggleExportMenu,
  onExport,
  isCreator,
  canAnnotate,
  onDelete,
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
          {project && (
            <div className="text-xs text-[var(--text-secondary)]">
              Project: {project.name}
            </div>
          )}
        </div>

        {/* Simple Status Badge */}
        {currentStageProgress?.status && (
          <StatusBadge status={currentStageProgress.status} />
        )}

        {/* Annotation Toolbar */}
        <div className="pt-4 border-t border-[var(--border-main)]">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Annotation Tools
          </h3>
          {!canAnnotate && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              Only the creator or assigned reviewers can add annotations and comments.
            </div>
          )}
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
            disabled={!canAnnotate}
          />
        </div>
      </div>

      {/* Bottom Section - Action Buttons */}
      <div className="mt-auto p-4 space-y-2 border-t border-[var(--border-main)] bg-[var(--bg-secondary)]">
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

