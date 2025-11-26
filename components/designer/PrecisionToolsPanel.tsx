'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Ruler, GitBranch } from 'lucide-react';
import MeasurementsSection from './MeasurementsSection';
import GuideLinesSection from './GuideLinesSection';
import type { Guide } from '@/lib/guidePresets';
import { PREPAID_CARD_SPECS } from '@/lib/guidePresets';
import { pxToUnit } from '@/lib/measurements';

interface PrecisionToolsPanelProps {
  // Element position and size (in canvas pixels)
  elementX: number;
  elementY: number;
  elementWidth: number;
  elementHeight: number;
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  // Selection state
  isSelected: boolean;
  // Aspect ratio lock
  aspectLocked: boolean;
  onAspectLockToggle: () => void;
  // Position/Size update callbacks
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  // Guide lines
  verticalGuides: Guide[];
  horizontalGuides: Guide[];
  showGuides: boolean;
  onToggleGuides: () => void;
  snapEnabled: boolean;
  onSnapToggle: () => void;
  onAddGuide: (type: 'vertical' | 'horizontal', position: number) => void;
  onRemoveGuide: (guideId: string) => void;
  onResetToPresets: () => void;
  // Show measurements overlay
  showMeasurements: boolean;
  onToggleMeasurements: () => void;
}

/**
 * PrecisionToolsPanel is the main sidebar panel that combines
 * measurements and guide lines functionality.
 *
 * Features:
 * - Collapsible sections for Measurements and Guide Lines
 * - Card specs display
 * - Toggle for measurement overlay visibility
 */
const PrecisionToolsPanel: React.FC<PrecisionToolsPanelProps> = ({
  elementX,
  elementY,
  elementWidth,
  elementHeight,
  canvasWidth,
  canvasHeight,
  isSelected,
  aspectLocked,
  onAspectLockToggle,
  onPositionChange,
  onSizeChange,
  verticalGuides,
  horizontalGuides,
  showGuides,
  onToggleGuides,
  snapEnabled,
  onSnapToggle,
  onAddGuide,
  onRemoveGuide,
  onResetToPresets,
  showMeasurements,
  onToggleMeasurements,
}) => {
  const [measurementsExpanded, setMeasurementsExpanded] = useState(true);
  const [guidesExpanded, setGuidesExpanded] = useState(true);

  // Calculate card dimensions for display
  const cardWidthMm = pxToUnit(PREPAID_CARD_SPECS.width, 'mm', PREPAID_CARD_SPECS.dpi);
  const cardHeightMm = pxToUnit(PREPAID_CARD_SPECS.height, 'mm', PREPAID_CARD_SPECS.dpi);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Ruler className="h-4 w-4 text-cyan-600" />
          Precision Tools
        </h3>
      </div>

      {/* Measurements Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setMeasurementsExpanded(!measurementsExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {measurementsExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm font-medium text-gray-700">Measurements</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMeasurements();
            }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              showMeasurements
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {showMeasurements ? 'On' : 'Off'}
          </button>
        </button>

        {measurementsExpanded && (
          <div className="px-4 pb-4">
            <MeasurementsSection
              elementX={elementX}
              elementY={elementY}
              elementWidth={elementWidth}
              elementHeight={elementHeight}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              aspectLocked={aspectLocked}
              onAspectLockToggle={onAspectLockToggle}
              onPositionChange={onPositionChange}
              onSizeChange={onSizeChange}
              isSelected={isSelected}
            />
          </div>
        )}
      </div>

      {/* Guide Lines Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setGuidesExpanded(!guidesExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {guidesExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm font-medium text-gray-700">Guide Lines</span>
          </div>
          <span
            className={`px-2 py-0.5 text-xs rounded ${
              showGuides
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {verticalGuides.length + horizontalGuides.length}
          </span>
        </button>

        {guidesExpanded && (
          <div className="px-4 pb-4">
            <GuideLinesSection
              verticalGuides={verticalGuides}
              horizontalGuides={horizontalGuides}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              snapEnabled={snapEnabled}
              onSnapToggle={onSnapToggle}
              onAddGuide={onAddGuide}
              onRemoveGuide={onRemoveGuide}
              onResetToPresets={onResetToPresets}
              showGuides={showGuides}
              onToggleGuides={onToggleGuides}
            />
          </div>
        )}
      </div>

      {/* Card Specs Footer */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center justify-between">
            <span>Card Size</span>
            <span className="font-mono">
              {PREPAID_CARD_SPECS.width} × {PREPAID_CARD_SPECS.height}px
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Physical</span>
            <span className="font-mono">
              {cardWidthMm.toFixed(1)} × {cardHeightMm.toFixed(1)}mm
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>DPI</span>
            <span className="font-mono">{PREPAID_CARD_SPECS.dpi}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrecisionToolsPanel;
