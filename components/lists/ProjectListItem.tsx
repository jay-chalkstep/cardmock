'use client';

import { useRouter } from 'next/navigation';
import { Project } from '@/lib/supabase';
import { CheckSquare, Square, ArrowRight } from 'lucide-react';

interface ProjectListItemProps {
  project: Project;
  isSelected: boolean;
  onToggleSelect?: () => void;
}

export default function ProjectListItem({
  project,
  isSelected,
  onToggleSelect,
}: ProjectListItemProps) {
  const router = useRouter();

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect();
    }
  };

  const handleGoToProject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Verify project exists before navigating
    try {
      const response = await fetch(`/api/projects/${project.id}`);
      if (!response.ok) {
        const result = await response.json();
        const errorMessage = result.error || 'Project not found';
        console.error('Project not found:', {
          projectId: project.id,
          error: errorMessage,
          status: response.status
        });
        
        // Show error and refresh the page to update the project list
        alert(`Project not found: ${project.name || project.id}\n\nThe project may have been deleted. Refreshing the project list...`);
        window.location.reload();
        return;
      }
      
      // Project exists, navigate to it
      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error('Error verifying project:', error);
      // Still try to navigate - the detail page will handle the error
      router.push(`/projects/${project.id}`);
    }
  };

  // Status color mapping
  const statusColors = {
    active: 'text-[var(--accent-green)]',
    completed: 'text-[var(--accent-blue)]',
    archived: 'text-[var(--text-tertiary)]',
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2 border-b border-[var(--border-light)]
        hover-row transition-colors
        ${isSelected ? 'bg-[var(--bg-selected)]' : 'bg-white'}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheckboxClick}
        className="flex-shrink-0 p-0.5 hover:bg-[var(--bg-hover)] rounded transition-colors"
      >
        {isSelected ? (
          <CheckSquare size={18} className="text-[var(--accent-blue)]" />
        ) : (
          <Square size={18} className="text-[var(--text-tertiary)]" />
        )}
      </button>

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-[var(--text-primary)] truncate">
          {project.client_name || 'No client'}
        </div>
        <div className="text-xs text-[var(--text-secondary)] truncate">
          {project.name}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0 w-24">
        <span className={`text-xs font-medium capitalize ${statusColors[project.status]}`}>
          {project.status}
        </span>
      </div>

      {/* Go to Project Button */}
      <button
        onClick={handleGoToProject}
        className="flex-shrink-0 w-[120px] flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[var(--accent-blue)] hover:bg-[var(--accent-blue)] hover:bg-opacity-10 rounded transition-colors"
        title="Go to project detail"
      >
        <span>Go to Project</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
