'use client';

import { X, Loader2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  name: string;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({
  name,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          className="bg-[var(--bg-elevated)] w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete CardMock?</h3>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} className="text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-[var(--text-primary)]">
                  "<strong>{name}</strong>" will be moved to trash. You can restore it within 30 days.
                </p>
                <p className="mt-2 text-sm text-[var(--text-tertiary)]">
                  All comments, reviews, and activity history will also be deleted.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border-default)] flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
