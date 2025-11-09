/**
 * Mockup Detail Preview Panel Component
 * Contains tabs for Comments and Approvals
 */

import { MessageSquare, Check } from 'lucide-react';
import CommentsSidebar from '@/components/collaboration/CommentsSidebar';
import ApprovalTimelinePanel from '@/components/approvals/ApprovalTimelinePanel';
import type { Workflow, AssetApprovalSummary } from '@/lib/supabase';
import type { Comment } from '@/app/(dashboard)/mockups/[id]/page';

interface MockupDetailPreviewPanelProps {
  mockupId: string;
  comments: Comment[];
  currentUserId: string;
  isCreator: boolean;
  onCommentUpdate: () => void;
  onCommentHover: (commentId: string | null) => void;
  hoveredCommentId: string | null;
  approvalSummary: AssetApprovalSummary | null;
  workflow: Workflow | null;
  rightPanelTab: 'comments' | 'approvals';
  onTabChange: (tab: 'comments' | 'approvals') => void;
}

export default function MockupDetailPreviewPanel({
  mockupId,
  comments,
  currentUserId,
  isCreator,
  onCommentUpdate,
  onCommentHover,
  hoveredCommentId,
  approvalSummary,
  workflow,
  rightPanelTab,
  onTabChange,
}: MockupDetailPreviewPanelProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => onTabChange('comments')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            rightPanelTab === 'comments'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="h-4 w-4 inline mr-2" />
          Comments
          {comments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
              {comments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => onTabChange('approvals')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            rightPanelTab === 'approvals'
              ? 'text-green-600 border-b-2 border-green-600 bg-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Check className="h-4 w-4 inline mr-2" />
          Approvals
          {approvalSummary && approvalSummary.approvals_by_stage && Object.keys(approvalSummary.approvals_by_stage).length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-green-200 text-green-700 text-xs rounded-full">
              {Object.values(approvalSummary.approvals_by_stage).flat().length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {rightPanelTab === 'comments' ? (
          <CommentsSidebar
            mockupId={mockupId}
            comments={comments}
            currentUserId={currentUserId}
            isCreator={isCreator}
            onCommentUpdate={onCommentUpdate}
            onCommentHover={onCommentHover}
            hoveredCommentId={hoveredCommentId}
          />
        ) : rightPanelTab === 'approvals' ? (
          approvalSummary && workflow?.stages ? (
            <ApprovalTimelinePanel
              approvalSummary={approvalSummary}
              stages={workflow.stages}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              <div className="text-sm">No approvals data</div>
              <div className="text-xs mt-1">This asset is not in an approval workflow</div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

