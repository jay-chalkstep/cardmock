'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Star, Trash2, Copy, FolderInput } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MockupGridCardProps {
  mockup: {
    id: string;
    name?: string;
    mockup_name?: string;
    preview_url?: string;
    mockup_image_url?: string;
    updated_at: string;
    created_at: string;
    project?: {
      id: string;
      name: string;
      color: string;
    } | null;
    is_featured?: boolean;
  };
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onMove?: (id: string) => void;
  onToggleFeatured?: (id: string) => void;
}

export default function MockupGridCard({
  mockup,
  onDelete,
  onDuplicate,
  onMove,
  onToggleFeatured,
}: MockupGridCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);

  const name = mockup.name || mockup.mockup_name || 'Untitled';
  const thumbnailUrl = mockup.preview_url || mockup.mockup_image_url;
  const editedTime = formatDistanceToNow(new Date(mockup.updated_at || mockup.created_at), { addSuffix: true });

  return (
    <div className="group relative">
      <Link href={`/mockups/${mockup.id}`}>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer">
          {/* Thumbnail */}
          <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
            {thumbnailUrl && !imageError ? (
              <img
                src={thumbnailUrl}
                alt={name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-500 text-xl font-bold">{name[0]?.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Featured badge */}
            {mockup.is_featured && (
              <div className="absolute top-2 left-2">
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
              </div>
            )}

            {/* Project badge */}
            {mockup.project && (
              <div className="absolute top-2 right-2">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: mockup.project.color }}
                >
                  {mockup.project.name}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
              {name}
            </h3>
            <p className="text-xs text-gray-500">
              Edited {editedTime}
            </p>
          </div>
        </div>
      </Link>

      {/* Action Menu Button */}
      {(onDelete || onDuplicate || onMove || onToggleFeatured) && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 bg-white/90 hover:bg-white rounded-md shadow-sm border border-gray-200"
          >
            <MoreHorizontal size={16} className="text-gray-600" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                {onToggleFeatured && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onToggleFeatured(mockup.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Star size={16} className={mockup.is_featured ? 'text-yellow-500 fill-yellow-500' : ''} />
                    {mockup.is_featured ? 'Remove from featured' : 'Add to featured'}
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onDuplicate(mockup.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Copy size={16} />
                    Duplicate
                  </button>
                )}
                {onMove && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onMove(mockup.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <FolderInput size={16} />
                    Move to project
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete(mockup.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
