'use client';

import React from 'react';
import { Plus, X, RotateCcw, Magnet } from 'lucide-react';
import type { Guide } from '@/lib/guidePresets';
import {
  PREPAID_CARD_SPECS,
  LOGO_CONSTRAINTS,
  GUIDE_COLORS,
  getDefaultGuides,
} from '@/lib/guidePresets';

interface GuideLinesSectionProps {
  // Guide data
  verticalGuides: Guide[];
  horizontalGuides: Guide[];
  // Canvas dimensions for scaling
  canvasWidth: number;
  canvasHeight: number;
  // Snap settings
  snapEnabled: boolean;
  onSnapToggle: () => void;
  // Callbacks
  onAddGuide: (type: 'vertical' | 'horizontal', position: number) => void;
  onRemoveGuide: (guideId: string) => void;
  onResetToPresets: () => void;
  // Visibility
  showGuides: boolean;
  onToggleGuides: () => void;
}

/**
 * GuideLinesSection provides UI for managing template guide lines.
 *
 * Features:
 * - List of vertical and horizontal guides with positions
 * - Add/remove custom guides
 * - Reset to preset guides
 * - Snap toggle
 * - Prepaid card specs reference
 */
const GuideLinesSection: React.FC<GuideLinesSectionProps> = ({
  verticalGuides,
  horizontalGuides,
  canvasWidth,
  canvasHeight,
  snapEnabled,
  onSnapToggle,
  onAddGuide,
  onRemoveGuide,
  onResetToPresets,
  showGuides,
  onToggleGuides,
}) => {
  // Scale factor from canvas to card coordinates
  const scaleX = PREPAID_CARD_SPECS.width / canvasWidth;
  const scaleY = PREPAID_CARD_SPECS.height / canvasHeight;

  // Convert canvas position to card position (for display)
  const toCardPx = (canvasPx: number, isVertical: boolean = false): number => {
    return Math.round(canvasPx * (isVertical ? scaleY : scaleX));
  };

  // Handle adding a new guide
  const handleAddVerticalGuide = () => {
    // Add at center by default
    const centerPosition = canvasWidth / 2;
    onAddGuide('vertical', centerPosition);
  };

  const handleAddHorizontalGuide = () => {
    // Add at center by default
    const centerPosition = canvasHeight / 2;
    onAddGuide('horizontal', centerPosition);
  };

  // Render a guide list item
  const renderGuideItem = (guide: Guide, type: 'vertical' | 'horizontal') => {
    const cardPosition = toCardPx(guide.position, type === 'horizontal');

    return (
      <div
        key={guide.id}
        className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded text-sm"
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: guide.color }}
          />
          <span className="font-mono text-gray-700">{cardPosition}px</span>
          {guide.isPreset && (
            <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
              preset
            </span>
          )}
          {guide.label && !guide.isPreset && (
            <span className="text-xs text-gray-400">{guide.label}</span>
          )}
        </div>
        <button
          onClick={() => onRemoveGuide(guide.id)}
          className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
          title={guide.isPreset ? 'Hide preset guide' : 'Remove guide'}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleGuides}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            showGuides
              ? 'bg-cyan-100 text-cyan-700 border border-cyan-300'
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}
        >
          {showGuides ? 'Hide Guides' : 'Show Guides'}
        </button>

        <button
          onClick={onSnapToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            snapEnabled
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}
          title={snapEnabled ? 'Snap to guides enabled' : 'Snap to guides disabled'}
        >
          <Magnet className="h-3.5 w-3.5" />
          Snap
        </button>
      </div>

      {/* Vertical Guides */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Vertical Guides
        </h4>
        <div className="space-y-1">
          {verticalGuides.length > 0 ? (
            verticalGuides.map((guide) => renderGuideItem(guide, 'vertical'))
          ) : (
            <p className="text-xs text-gray-400 py-2">No vertical guides</p>
          )}
        </div>
        <button
          onClick={handleAddVerticalGuide}
          className="mt-2 flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Vertical Guide
        </button>
      </div>

      {/* Horizontal Guides */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Horizontal Guides
        </h4>
        <div className="space-y-1">
          {horizontalGuides.length > 0 ? (
            horizontalGuides.map((guide) => renderGuideItem(guide, 'horizontal'))
          ) : (
            <p className="text-xs text-gray-400 py-2">No horizontal guides</p>
          )}
        </div>
        <button
          onClick={handleAddHorizontalGuide}
          className="mt-2 flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Horizontal Guide
        </button>
      </div>

      {/* Reset Button */}
      <button
        onClick={onResetToPresets}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset to Presets
      </button>

      {/* Prepaid Card Specs Reference */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Prepaid Card Specs
        </h4>
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Logo left edge:</span>
            <span className="font-mono text-cyan-600">{LOGO_CONSTRAINTS.minLeft}px</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Logo top edge:</span>
            <span className="font-mono text-cyan-600">{LOGO_CONSTRAINTS.minTop}px</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Midpoint:</span>
            <span className="font-mono text-amber-600">{LOGO_CONSTRAINTS.maxRight}px</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Max logo width:</span>
            <span className="font-mono text-gray-700">{LOGO_CONSTRAINTS.maxWidth}px</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideLinesSection;
