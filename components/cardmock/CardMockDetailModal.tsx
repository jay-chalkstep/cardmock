'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Download,
  Share2,
  MessageSquare,
  Pencil,
  Copy,
  FolderInput,
  MoreHorizontal,
  Archive,
  Trash2,
  Link2,
  History,
  Calendar,
  User,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CardMockPreview from './CardMockPreview';
import DownloadDropdown from './DownloadDropdown';
import ShareModal from './ShareModal';
import RequestReviewModal from './RequestReviewModal';
import DuplicateModal from './DuplicateModal';
import MoveModal from './MoveModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import CardMockHistory from './CardMockHistory';
import StatusBadge from './StatusBadge';

export interface CardMockData {
  id: string;
  name?: string;
  mockup_name?: string;
  preview_url?: string;
  mockup_image_url?: string;
  back_image_url?: string;
  status?: 'draft' | 'in_review' | 'approved' | 'needs_changes';
  created_at: string;
  updated_at: string;
  created_by?: string;
  creator_name?: string;
  creator_avatar?: string;
  brand_id?: string;
  brand?: {
    id: string;
    company_name: string;
  };
  project?: {
    id: string;
    name: string;
    color: string;
  };
}

interface CardMockDetailModalProps {
  cardMock: CardMockData;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
}

export default function CardMockDetailModal({
  cardMock,
  isOpen,
  onClose,
  onDelete,
  onUpdate,
}: CardMockDetailModalProps) {
  const router = useRouter();
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');

  // Modal states
  const [showDownload, setShowDownload] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Loading state for async operations
  const [isDeleting, setIsDeleting] = useState(false);

  const name = cardMock.name || cardMock.mockup_name || 'Untitled';
  const previewUrl = cardMock.preview_url || cardMock.mockup_image_url;
  const hasBack = !!cardMock.back_image_url;
  const status = cardMock.status || 'draft';

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleEdit = () => {
    router.push(`/designer/${cardMock.id}`);
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/mockups/${cardMock.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete?.(cardMock.id);
        setShowDeleteModal(false);
        onClose();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting CardMock:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/mockups/${cardMock.id}`;
    await navigator.clipboard.writeText(url);
    setShowMoreMenu(false);
    // Could add toast notification here
  };

  const handleArchive = async () => {
    try {
      const response = await fetch(`/api/mockups/${cardMock.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: true }),
      });

      if (response.ok) {
        onUpdate?.();
        setShowMoreMenu(false);
        onClose();
      }
    } catch (error) {
      console.error('Error archiving CardMock:', error);
    }
  };

  if (!isOpen) return null;

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[var(--bg-elevated)] w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
            >
              <ChevronLeft size={16} />
              Back to CardMocks
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
            >
              <X size={20} className="text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Preview (60%) */}
            <div className="w-[60%] bg-[var(--bg-surface)] p-6 flex flex-col">
              <CardMockPreview
                frontUrl={previewUrl}
                backUrl={cardMock.back_image_url}
                currentSide={currentSide}
                onSideChange={setCurrentSide}
                name={name}
              />
            </div>

            {/* Right Panel - Info & Actions (40%) */}
            <div className="w-[40%] flex flex-col overflow-hidden">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Header Section */}
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                    {name}
                  </h2>

                  {cardMock.brand && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      Brand: <span className="text-[var(--accent-primary)]">{cardMock.brand.company_name}</span>
                    </p>
                  )}

                  <StatusBadge status={status} />

                  <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Updated {formatTimestamp(cardMock.updated_at)}
                    </span>
                  </div>

                  {cardMock.creator_name && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      {cardMock.creator_avatar ? (
                        <img
                          src={cardMock.creator_avatar}
                          alt={cardMock.creator_name}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)] flex items-center justify-center">
                          <User size={12} className="text-[var(--text-tertiary)]" />
                        </div>
                      )}
                      Created by {cardMock.creator_name}
                    </div>
                  )}
                </div>

                {/* Primary Actions */}
                <div className="space-y-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowDownload(!showDownload)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] transition-colors font-medium"
                    >
                      <Download size={18} />
                      Download
                    </button>
                    {showDownload && (
                      <DownloadDropdown
                        cardMock={cardMock}
                        hasBack={hasBack}
                        onClose={() => setShowDownload(false)}
                      />
                    )}
                  </div>

                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors font-medium"
                  >
                    <Share2 size={18} />
                    Share
                  </button>

                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors font-medium"
                  >
                    <MessageSquare size={18} />
                    Request Review
                  </button>

                  <button
                    onClick={handleEdit}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors font-medium"
                  >
                    <Pencil size={18} />
                    Edit
                  </button>
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDuplicateModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                    Duplicate
                  </button>
                  <button
                    onClick={() => setShowMoveModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
                  >
                    <FolderInput size={16} />
                    Move
                  </button>

                  {/* More Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {showMoreMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowMoreMenu(false)}
                        />
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg shadow-lg z-20 py-1">
                          <button
                            onClick={handleCopyLink}
                            className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2"
                          >
                            <Link2 size={16} />
                            Copy link
                          </button>
                          <button
                            onClick={handleArchive}
                            className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2"
                          >
                            <Archive size={16} />
                            Archive
                          </button>
                          <button
                            onClick={() => {
                              setShowMoreMenu(false);
                              setShowDeleteModal(true);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* History Section */}
                <div className="border-t border-[var(--border-default)] pt-4">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors"
                  >
                    <History size={16} />
                    History
                    <span className="text-[var(--text-tertiary)]">
                      {showHistory ? '▴' : '▾'}
                    </span>
                  </button>

                  {showHistory && (
                    <CardMockHistory cardMockId={cardMock.id} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {showShareModal && (
        <ShareModal
          cardMock={cardMock}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showReviewModal && (
        <RequestReviewModal
          cardMock={cardMock}
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            setShowReviewModal(false);
            onUpdate?.();
          }}
        />
      )}

      {showDuplicateModal && (
        <DuplicateModal
          cardMock={cardMock}
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          onSuccess={(newId) => {
            setShowDuplicateModal(false);
            router.push(`/mockups/${newId}`);
          }}
        />
      )}

      {showMoveModal && (
        <MoveModal
          cardMock={cardMock}
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          onSuccess={() => {
            setShowMoveModal(false);
            onUpdate?.();
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          name={name}
          isOpen={showDeleteModal}
          isDeleting={isDeleting}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
