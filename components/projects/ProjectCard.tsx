'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreVertical, Edit2, Trash2, Image as ImageIcon, Workflow as WorkflowIcon } from 'lucide-react';
import type { Project } from '@/lib/supabase';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export default function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  };

  return (
    <div className="relative group">
      {/* Color indicator bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: project.color }}
      />

      {/* Card content */}
      <Link href={`/projects/${project.id}`}>
        <div className="bg-white border border-gray-200 rounded-lg p-5 pl-6 hover:shadow-md transition-shadow duration-200 cursor-pointer">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {project.name}
              </h3>
            </div>

            {/* Action menu */}
            {(onEdit || onDelete) && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-5 w-5 text-gray-500" />
                </button>

                {showMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(false);
                      }}
                    />
                    {/* Menu */}
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowMenu(false);
                            onEdit(project);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit Project
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowMenu(false);
                            onDelete(project);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Project
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Status and Workflow badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                statusColors[project.status]
              }`}
            >
              {statusLabels[project.status]}
            </span>

            {/* Workflow badge */}
            {project.workflow && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                <WorkflowIcon className="h-3 w-3" />
                {project.workflow.stages.length}-Stage Workflow
              </span>
            )}
          </div>

          {/* Mockup previews */}
          {project.mockup_previews && project.mockup_previews.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {project.mockup_previews.slice(0, 4).map((mockup) => (
                <div
                  key={mockup.id}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                >
                  {mockup.mockup_image_url ? (
                    <img
                      src={mockup.mockup_image_url}
                      alt={mockup.mockup_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-3 py-8 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400">
              <ImageIcon className="h-8 w-8 mb-2" />
              <p className="text-sm">No mockups yet</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
            <span>
              {project.mockup_count || 0} {project.mockup_count === 1 ? 'mockup' : 'mockups'}
            </span>
            <span className="text-xs">
              Created {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
