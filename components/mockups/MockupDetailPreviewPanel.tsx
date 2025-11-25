/**
 * Mockup Detail Preview Panel Component
 * Shows comments for the mockup
 */

import { MessageSquare } from 'lucide-react';
import CommentsSidebar from '@/components/collaboration/CommentsSidebar';
import type { Comment } from '@/app/(dashboard)/mockups/[id]/page';

interface MockupDetailPreviewPanelProps {
  mockupId: string;
  comments: Comment[];
  currentUserId: string;
  isCreator: boolean;
  onCommentUpdate: () => void;
  onCommentHover: (commentId: string | null) => void;
  hoveredCommentId: string | null;
}

export default function MockupDetailPreviewPanel({
  mockupId,
  comments,
  currentUserId,
  isCreator,
  onCommentUpdate,
  onCommentHover,
  hoveredCommentId,
}: MockupDetailPreviewPanelProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <MessageSquare className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">Comments</span>
        {comments.length > 0 && (
          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
            {comments.length}
          </span>
        )}
      </div>

      {/* Comments */}
      <div className="flex-1 overflow-y-auto">
        <CommentsSidebar
          mockupId={mockupId}
          comments={comments}
          currentUserId={currentUserId}
          isCreator={isCreator}
          onCommentUpdate={onCommentUpdate}
          onCommentHover={onCommentHover}
          hoveredCommentId={hoveredCommentId}
        />
      </div>
    </div>
  );
}

