'use client';

import { useState } from 'react';
import {
  MousePointer,
  MapPin,
  ArrowUpRight,
  Circle,
  Square,
  PenTool,
  Type,
  Palette,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { AnnotationTool } from '@/app/(dashboard)/mockups/[id]/page';

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  strokeColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#22C55E', // Green (DEFAULT)
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#FACC15', // Yellow
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#000000', // Black
  '#6B7280'  // Gray
];

export default function AnnotationToolbar({
  activeTool,
  onToolChange,
  strokeColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  disabled = false
}: AnnotationToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokePicker, setShowStrokePicker] = useState(false);

  const tools: Array<{
    id: AnnotationTool;
    icon: React.ElementType;
    label: string;
  }> = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'pin', icon: MapPin, label: 'Pin' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'freehand', icon: PenTool, label: 'Freehand' },
    { id: 'text', icon: Type, label: 'Text' }
  ];

  return (
    <div className="h-full flex flex-col items-center py-4 gap-2">
      {/* Drawing Tools */}
      <div className="flex flex-col gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => !disabled && onToolChange(tool.id)}
              disabled={disabled && tool.id !== 'select'}
              className={`
                p-3 rounded-lg transition-all relative group
                ${disabled && tool.id !== 'select'
                  ? 'opacity-50 cursor-not-allowed'
                  : isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }
              `}
              title={disabled && tool.id !== 'select' ? 'Only creators and reviewers can annotate' : tool.label}
            >
              <Icon className="h-5 w-5" />

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {tool.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-12 h-px bg-gray-200 my-2" />

      {/* Color Picker */}
      <div className="relative">
        <button
          onClick={() => !disabled && setShowColorPicker(!showColorPicker)}
          disabled={disabled}
          className={`
            p-3 rounded-lg transition-colors relative group
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-gray-100'
            }
          `}
          title={disabled ? 'Only creators and reviewers can annotate' : 'Color'}
        >
          <div className="relative">
            <Palette className="h-5 w-5 text-gray-600" />
            <div
              className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: strokeColor }}
            />
          </div>

          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Color
          </div>
        </button>

        {/* Color Picker Dropdown */}
        {showColorPicker && !disabled && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowColorPicker(false)}
            />
            <div className="absolute left-full ml-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20">
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      if (!disabled) {
                        onColorChange(color);
                        setShowColorPicker(false);
                      }
                    }}
                    className={`
                      w-8 h-8 rounded-full border-2 transition-all
                      ${strokeColor === color
                        ? 'border-blue-500 scale-110'
                        : 'border-gray-300 hover:scale-105'
                      }
                    `}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom Color Input */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="text-xs text-gray-600 mb-1 block">
                  Custom Color
                </label>
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => !disabled && onColorChange(e.target.value)}
                  disabled={disabled}
                  className="w-full h-8 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Stroke Width */}
      <div className="relative">
        <button
          onClick={() => !disabled && setShowStrokePicker(!showStrokePicker)}
          disabled={disabled}
          className={`
            p-3 rounded-lg transition-colors relative group
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-gray-100'
            }
          `}
          title={disabled ? 'Only creators and reviewers can annotate' : 'Stroke Width'}
        >
          <div className="relative">
            <Minus className="h-5 w-5 text-gray-600" />
            <div className="absolute -bottom-1 -right-1 text-xs font-bold text-gray-900 bg-white rounded-full w-4 h-4 flex items-center justify-center border border-gray-300">
              {strokeWidth}
            </div>
          </div>

          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Stroke Width
          </div>
        </button>

        {/* Stroke Width Picker */}
        {showStrokePicker && !disabled && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowStrokePicker(false)}
            />
            <div className="absolute left-full ml-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 w-48">
              <label className="text-xs text-gray-600 mb-2 block">
                Stroke Width: {strokeWidth}px
              </label>
              <input
                type="range"
                disabled={disabled}
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => !disabled && onStrokeWidthChange(parseInt(e.target.value))}
                className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {/* Preset Widths */}
              <div className="grid grid-cols-5 gap-2 mt-3">
                {[1, 3, 5, 8, 12].map((width) => (
                  <button
                    key={width}
                    onClick={() => {
                      if (!disabled) {
                        onStrokeWidthChange(width);
                        setShowStrokePicker(false);
                      }
                    }}
                    disabled={disabled}
                    className={`
                      px-2 py-1 text-xs rounded border
                      ${disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : strokeWidth === width
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {width}px
                  </button>
                ))}
              </div>

              {/* Visual Preview */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Preview</p>
                <div className="bg-gray-50 rounded p-2 flex items-center justify-center">
                  <div
                    style={{
                      width: '100%',
                      height: `${strokeWidth}px`,
                      backgroundColor: strokeColor,
                      borderRadius: strokeWidth > 4 ? '4px' : '2px'
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="w-12 h-px bg-gray-200 my-2" />

      {/* Zoom Controls */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onZoomIn}
          disabled={scale >= 4.0}
          className="p-3 rounded-lg transition-colors relative group disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 hover:bg-gray-100"
          title="Zoom In"
        >
          <ZoomIn className="h-5 w-5" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Zoom In
          </div>
        </button>

        <div className="text-center">
          <span className="text-xs font-medium text-gray-700">
            {Math.round(scale * 100)}%
          </span>
        </div>

        <button
          onClick={onZoomOut}
          disabled={scale <= 0.25}
          className="p-3 rounded-lg transition-colors relative group disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 hover:bg-gray-100"
          title="Zoom Out"
        >
          <ZoomOut className="h-5 w-5" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Zoom Out
          </div>
        </button>

        <button
          onClick={onZoomReset}
          className="p-3 rounded-lg transition-colors relative group text-gray-600 hover:bg-gray-100"
          title="Reset Zoom"
        >
          <RotateCcw className="h-5 w-5" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Reset Zoom
          </div>
        </button>
      </div>

      {/* Tool Info */}
      <div className="mt-auto text-center px-2">
        <p className="text-xs text-gray-500 leading-tight">
          {activeTool === 'select' && 'Select & move'}
          {activeTool === 'pin' && 'Click to pin'}
          {activeTool === 'arrow' && 'Drag to draw'}
          {activeTool === 'circle' && 'Drag to draw'}
          {activeTool === 'rect' && 'Drag to draw'}
          {activeTool === 'freehand' && 'Draw freely'}
          {activeTool === 'text' && 'Click to place'}
        </p>
      </div>
    </div>
  );
}
