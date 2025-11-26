'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import {
  type Unit,
  pxToUnit,
  unitToPx,
  formatMeasurement,
  getUnitLabel,
} from '@/lib/measurements';
import { PREPAID_CARD_SPECS } from '@/lib/guidePresets';

interface MeasurementsSectionProps {
  // Element position and size (in canvas pixels)
  elementX: number;
  elementY: number;
  elementWidth: number;
  elementHeight: number;
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  // Aspect ratio lock
  aspectLocked: boolean;
  onAspectLockToggle: () => void;
  // Update callbacks
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  // Whether element is selected
  isSelected: boolean;
}

/**
 * MeasurementsSection provides editable position and size inputs
 * for the selected element with unit conversion support.
 *
 * Features:
 * - Position fields: Left, Top, Right, Bottom
 * - Size fields: Width, Height
 * - Unit toggle: px / mm / in
 * - Aspect ratio lock
 * - Secondary display showing converted units
 */
const MeasurementsSection: React.FC<MeasurementsSectionProps> = ({
  elementX,
  elementY,
  elementWidth,
  elementHeight,
  canvasWidth,
  canvasHeight,
  aspectLocked,
  onAspectLockToggle,
  onPositionChange,
  onSizeChange,
  isSelected,
}) => {
  const [unit, setUnit] = useState<Unit>('px');

  // Calculate scale factor from canvas to card coordinates
  const scaleX = PREPAID_CARD_SPECS.width / canvasWidth;
  const scaleY = PREPAID_CARD_SPECS.height / canvasHeight;

  // Convert canvas pixels to card pixels (at 300 DPI)
  const toCardPx = (canvasPx: number, isVertical: boolean = false): number => {
    return canvasPx * (isVertical ? scaleY : scaleX);
  };

  // Convert card pixels to canvas pixels
  const fromCardPx = (cardPx: number, isVertical: boolean = false): number => {
    return cardPx / (isVertical ? scaleY : scaleX);
  };

  // Calculate derived measurements in card pixels
  const leftPx = toCardPx(elementX);
  const topPx = toCardPx(elementY, true);
  const widthPx = toCardPx(elementWidth);
  const heightPx = toCardPx(elementHeight, true);
  const rightPx = PREPAID_CARD_SPECS.width - leftPx - widthPx;
  const bottomPx = PREPAID_CARD_SPECS.height - topPx - heightPx;

  // Handle input changes
  const handleLeftChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const cardPx = unit === 'px' ? numValue : unitToPx(numValue, unit, PREPAID_CARD_SPECS.dpi);
    const canvasPx = fromCardPx(cardPx);
    onPositionChange(Math.max(0, canvasPx), elementY);
  };

  const handleTopChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const cardPx = unit === 'px' ? numValue : unitToPx(numValue, unit, PREPAID_CARD_SPECS.dpi);
    const canvasPx = fromCardPx(cardPx, true);
    onPositionChange(elementX, Math.max(0, canvasPx));
  };

  const handleRightChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const cardPx = unit === 'px' ? numValue : unitToPx(numValue, unit, PREPAID_CARD_SPECS.dpi);
    // Calculate new X from right position: x = cardWidth - width - right
    const newLeftCardPx = PREPAID_CARD_SPECS.width - widthPx - cardPx;
    const canvasPx = fromCardPx(newLeftCardPx);
    onPositionChange(Math.max(0, canvasPx), elementY);
  };

  const handleBottomChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const cardPx = unit === 'px' ? numValue : unitToPx(numValue, unit, PREPAID_CARD_SPECS.dpi);
    // Calculate new Y from bottom position: y = cardHeight - height - bottom
    const newTopCardPx = PREPAID_CARD_SPECS.height - heightPx - cardPx;
    const canvasPx = fromCardPx(newTopCardPx, true);
    onPositionChange(elementX, Math.max(0, canvasPx));
  };

  const handleWidthChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    const cardPx = unit === 'px' ? numValue : unitToPx(numValue, unit, PREPAID_CARD_SPECS.dpi);
    const canvasPx = fromCardPx(cardPx);

    if (aspectLocked) {
      const aspectRatio = elementHeight / elementWidth;
      onSizeChange(canvasPx, canvasPx * aspectRatio);
    } else {
      onSizeChange(canvasPx, elementHeight);
    }
  };

  const handleHeightChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    const cardPx = unit === 'px' ? numValue : unitToPx(numValue, unit, PREPAID_CARD_SPECS.dpi);
    const canvasPx = fromCardPx(cardPx, true);

    if (aspectLocked) {
      const aspectRatio = elementWidth / elementHeight;
      onSizeChange(canvasPx * aspectRatio, canvasPx);
    } else {
      onSizeChange(elementWidth, canvasPx);
    }
  };

  // Format value for display based on current unit
  const formatValue = (cardPx: number): string => {
    const converted = pxToUnit(cardPx, unit, PREPAID_CARD_SPECS.dpi);
    return formatMeasurement(converted, unit);
  };

  // Get secondary display value (always in mm)
  const getSecondaryValue = (cardPx: number): string => {
    const mm = pxToUnit(cardPx, 'mm', PREPAID_CARD_SPECS.dpi);
    return `${mm.toFixed(1)}mm`;
  };

  if (!isSelected) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        Select an element to see measurements
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Position Section */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Position
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {/* Left */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Left</label>
            <input
              type="number"
              value={formatValue(leftPx)}
              onChange={(e) => handleLeftChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <span className="text-xs text-gray-400">{getSecondaryValue(leftPx)}</span>
          </div>

          {/* Top */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Top</label>
            <input
              type="number"
              value={formatValue(topPx)}
              onChange={(e) => handleTopChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <span className="text-xs text-gray-400">{getSecondaryValue(topPx)}</span>
          </div>

          {/* Right */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Right</label>
            <input
              type="number"
              value={formatValue(rightPx)}
              onChange={(e) => handleRightChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <span className="text-xs text-gray-400">{getSecondaryValue(rightPx)}</span>
          </div>

          {/* Bottom */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Bottom</label>
            <input
              type="number"
              value={formatValue(bottomPx)}
              onChange={(e) => handleBottomChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <span className="text-xs text-gray-400">{getSecondaryValue(bottomPx)}</span>
          </div>
        </div>
      </div>

      {/* Size Section */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Size
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {/* Width */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Width</label>
            <input
              type="number"
              value={formatValue(widthPx)}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <span className="text-xs text-gray-400">{getSecondaryValue(widthPx)}</span>
          </div>

          {/* Height */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Height</label>
            <input
              type="number"
              value={formatValue(heightPx)}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <span className="text-xs text-gray-400">{getSecondaryValue(heightPx)}</span>
          </div>
        </div>

        {/* Aspect Ratio Lock */}
        <button
          onClick={onAspectLockToggle}
          className={`mt-2 flex items-center justify-center gap-2 w-full py-1.5 text-xs rounded transition-colors ${
            aspectLocked
              ? 'bg-cyan-100 text-cyan-700 border border-cyan-300'
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}
        >
          {aspectLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          {aspectLocked ? 'Aspect Ratio Locked' : 'Aspect Ratio Unlocked'}
        </button>
      </div>

      {/* Unit Toggle */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Unit
        </h4>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {(['px', 'mm', 'in'] as Unit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                unit === u
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {getUnitLabel(u)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MeasurementsSection;
