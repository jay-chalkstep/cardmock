'use client';

import { useState, useEffect } from 'react';
import { CardMockup } from '@/lib/supabase';
import { CheckSquare, Square, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import FigmaStatusBadge from '@/components/integrations/FigmaStatusBadge';

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
  const [figmaStatus, setFigmaStatus] = useState<'approved' | 'pending' | 'changes_requested' | null>(null);
  
  // Fetch Figma status if asset has Figma metadata
  useEffect(() => {
    if (mockup.figma_metadata) {
      fetch(`/api/integrations/figma/status/${mockup.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.status) {
            setFigmaStatus(data.data.status);
          }
        })
        .catch(() => {
          // Silently fail - not all assets have Figma status
        });
    }
  }, [mockup.id, mockup.figma_metadata]);

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

      {/* Tags - Figma Status Badge */}
      <div className="flex-shrink-0 flex gap-1">
        {figmaStatus && (
          <FigmaStatusBadge status={figmaStatus} />
        )}
      </div>

      {/* Time */}
      <div className="flex-shrink-0 text-xs text-[var(--text-tertiary)] w-20 text-right">
        {formatDistanceToNow(new Date(mockup.created_at), { addSuffix: true })}
      </div>
    </div>
  );
}
