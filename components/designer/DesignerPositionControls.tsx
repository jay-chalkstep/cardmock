/**
 * Designer Position Controls Component
 * Contains position controls and preset positions
 */

import { Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface DesignerPositionControlsProps {
  onMove: (direction: 'up' | 'down' | 'left' | 'right', amount?: number) => void;
  onSetPresetPosition: (preset: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center') => void;
}

export default function DesignerPositionControls({
  onMove,
  onSetPresetPosition,
}: DesignerPositionControlsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Move className="h-4 w-4" />
        Position
      </h3>

      {/* Arrow Controls */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        <div />
        <button
          onClick={() => onMove('up')}
          className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          <ChevronUp className="h-4 w-4 mx-auto" />
        </button>
        <div />
        <button
          onClick={() => onMove('left')}
          className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mx-auto" />
        </button>
        <button
          onClick={() => onSetPresetPosition('center')}
          className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          <Maximize2 className="h-4 w-4 mx-auto" />
        </button>
        <button
          onClick={() => onMove('right')}
          className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          <ChevronRight className="h-4 w-4 mx-auto" />
        </button>
        <div />
        <button
          onClick={() => onMove('down')}
          className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          <ChevronDown className="h-4 w-4 mx-auto" />
        </button>
        <div />
      </div>

      {/* Preset Positions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onSetPresetPosition('top-left')}
          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
        >
          Top Left
        </button>
        <button
          onClick={() => onSetPresetPosition('top-right')}
          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
        >
          Top Right
        </button>
        <button
          onClick={() => onSetPresetPosition('bottom-left')}
          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
        >
          Bottom Left
        </button>
        <button
          onClick={() => onSetPresetPosition('bottom-right')}
          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
        >
          Bottom Right
        </button>
      </div>
    </div>
  );
}

