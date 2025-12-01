'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { CardMockData } from './CardMockDetailModal';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface MoveModalProps {
  cardMock: CardMockData;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MoveModal({
  cardMock,
  isOpen,
  onClose,
  onSuccess,
}: MoveModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(cardMock.project?.id || '');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState('');

  const name = cardMock.name || cardMock.mockup_name || 'Untitled';
  const currentProject = cardMock.project?.name || 'No project';

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMove = async () => {
    if (selectedProjectId === cardMock.project?.id) {
      onClose();
      return;
    }

    setIsMoving(true);
    setError('');

    try {
      const response = await fetch(`/api/mockups/${cardMock.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to move');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move');
    } finally {
      setIsMoving(false);
    }
  };

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
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Move CardMock</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
            >
              <X size={20} className="text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Current Location */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Current project
              </label>
              <p className="text-[var(--text-primary)]">{currentProject}</p>
            </div>

            {/* Move To */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Move to
              </label>
              {isLoading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 size={20} className="animate-spin text-[var(--text-tertiary)]" />
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border-default)] flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={isMoving}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isMoving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Moving...
                </>
              ) : (
                'Move'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
