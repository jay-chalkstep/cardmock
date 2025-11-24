'use client';

import { useState, useEffect } from 'react';
import { CardMockup } from '@/lib/supabase';
import { CheckSquare, Square, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MockupListItemProps {
  mockup: CardMockup;
  isSelected: boolean;
  onToggleSelect?: () => void;
}

export default function MockupListItem({
  mockup,
  isSelected,
  onToggleSelect,
}: MockupListItemProps) {
  const [starred, setStarred] = useState(false);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred(!starred);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect();
    }
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

      {/* Star */}
      <button
        onClick={handleStarClick}
        className="flex-shrink-0 p-0.5 hover:text-[var(--accent-yellow)] transition-colors"
      >
        <Star
          size={18}
          className={starred ? 'fill-[var(--accent-yellow)] text-[var(--accent-yellow)]' : 'text-[var(--text-tertiary)]'}
        />
      </button>

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-12 h-12 bg-[var(--bg-primary)] rounded overflow-hidden">
        {mockup.mockup_image_url ? (
          <img
            src={mockup.mockup_image_url}
            alt={mockup.mockup_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-tertiary)] text-xs">
            No image
          </div>
        )}
      </div>

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-[var(--text-primary)] truncate">
          {mockup.mockup_name}
        </div>
        <div className="text-xs text-[var(--text-secondary)] truncate">
          {mockup.project?.name || 'No project'}
        </div>
      </div>


      {/* Time */}
      <div className="flex-shrink-0 text-xs text-[var(--text-tertiary)] w-20 text-right">
        {formatDistanceToNow(new Date(mockup.created_at), { addSuffix: true })}
      </div>
    </div>
  );
}
