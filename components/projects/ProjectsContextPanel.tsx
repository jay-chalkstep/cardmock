/**
 * Projects Context Panel Component
 * Contains search, new project button, and status filters
 */

import { Plus, Search } from 'lucide-react';
import type { ProjectStatus } from '@/lib/supabase';

interface ProjectsContextPanelProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onNewProject: () => void;
  statusFilter: ProjectStatus | 'all';
  onStatusFilterChange: (status: ProjectStatus | 'all') => void;
  totalCount: number;
  activeCount: number;
  completedCount: number;
  archivedCount: number;
}

export default function ProjectsContextPanel({
  searchTerm,
  onSearchChange,
  onNewProject,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  activeCount,
  completedCount,
  archivedCount,
}: ProjectsContextPanelProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
        />
      </div>

      <button
        onClick={onNewProject}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--accent-blue)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
      >
        <Plus size={16} />
        <span>New Project</span>
      </button>

      <div className="border-t border-[var(--border-main)] pt-4 space-y-1">
        <button
          onClick={() => onStatusFilterChange('all')}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
            statusFilter === 'all' ? 'bg-[var(--bg-selected)] text-[var(--accent-blue)]' : 'hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>All Projects</span>
          <span className="text-xs">{totalCount}</span>
        </button>
        <button
          onClick={() => onStatusFilterChange('active')}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
            statusFilter === 'active' ? 'bg-[var(--bg-selected)] text-[var(--accent-blue)]' : 'hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>Active</span>
          <span className="text-xs">{activeCount}</span>
        </button>
        <button
          onClick={() => onStatusFilterChange('completed')}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
            statusFilter === 'completed' ? 'bg-[var(--bg-selected)] text-[var(--accent-blue)]' : 'hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>Completed</span>
          <span className="text-xs">{completedCount}</span>
        </button>
        <button
          onClick={() => onStatusFilterChange('archived')}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
            statusFilter === 'archived' ? 'bg-[var(--bg-selected)] text-[var(--accent-blue)]' : 'hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>Archived</span>
          <span className="text-xs">{archivedCount}</span>
        </button>
      </div>
    </div>
  );
}

