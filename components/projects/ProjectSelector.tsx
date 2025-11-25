'use client';

import { useState, useRef, useEffect } from 'react';
import { Project } from '@/lib/supabase';
import {
  Briefcase,
  ChevronDown,
  XCircle,
} from 'lucide-react';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelect: (projectId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ProjectSelector({
  projects,
  selectedProjectId,
  onSelect,
  placeholder = 'Select project...',
  disabled = false
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleSelect = (projectId: string | null) => {
    onSelect(projectId);
    setIsOpen(false);
  };

  // Filter to only active projects (not archived)
  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedProjectId === null ? (
            <>
              <XCircle className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-900 truncate">No Project</span>
            </>
          ) : selectedProject ? (
            <>
              <div
                className="h-4 w-1 rounded flex-shrink-0"
                style={{ backgroundColor: selectedProject.color }}
              />
              <Briefcase className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-900 truncate">{selectedProject.name}</span>
            </>
          ) : (
            <span className="text-gray-500 truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {/* No Project Option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
              selectedProjectId === null ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <XCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">No Project</span>
          </button>

          {/* Divider */}
          {activeProjects.length > 0 && (
            <div className="border-t border-gray-100" />
          )}

          {/* Projects */}
          {activeProjects.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No active projects found
            </div>
          ) : (
            activeProjects.map(project => (
              <button
                key={project.id}
                type="button"
                onClick={() => handleSelect(project.id)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                  selectedProjectId === project.id ? 'bg-blue-50 text-blue-700' : ''
                }`}
              >
                <div
                  className="h-4 w-1 rounded flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <Briefcase className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate font-medium">{project.name}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
