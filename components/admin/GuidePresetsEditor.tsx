'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowRightLeft,
  ArrowUpDown,
  Save,
  RotateCcw,
} from 'lucide-react';

export interface GuidePreset {
  position: number;
  label: string;
  color: string;
  orientation: 'vertical' | 'horizontal';
}

export interface GuidePresetsEditorProps {
  presets: Record<string, GuidePreset>;
  onChange: (presets: Record<string, GuidePreset>) => void;
  templateWidth: number;
  templateHeight: number;
  disabled?: boolean;
}

const DEFAULT_COLORS = [
  '#22d3ee', // Cyan
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#10b981', // Emerald
  '#ef4444', // Red
  '#3b82f6', // Blue
];

export default function GuidePresetsEditor({
  presets,
  onChange,
  templateWidth,
  templateHeight,
  disabled = false,
}: GuidePresetsEditorProps) {
  const [newGuideKey, setNewGuideKey] = useState('');
  const [newGuideOrientation, setNewGuideOrientation] = useState<'vertical' | 'horizontal'>('vertical');

  const guideEntries = Object.entries(presets);
  const verticalGuides = guideEntries.filter(([, g]) => g.orientation === 'vertical');
  const horizontalGuides = guideEntries.filter(([, g]) => g.orientation === 'horizontal');

  const updateGuide = (key: string, updates: Partial<GuidePreset>) => {
    onChange({
      ...presets,
      [key]: { ...presets[key], ...updates },
    });
  };

  const removeGuide = (key: string) => {
    const updated = { ...presets };
    delete updated[key];
    onChange(updated);
  };

  const addGuide = () => {
    if (!newGuideKey.trim()) return;

    const key = newGuideKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (presets[key]) {
      alert('A guide with this name already exists');
      return;
    }

    const usedColors = Object.values(presets).map(p => p.color);
    const availableColor = DEFAULT_COLORS.find(c => !usedColors.includes(c)) || DEFAULT_COLORS[0];

    onChange({
      ...presets,
      [key]: {
        position: newGuideOrientation === 'vertical' ? Math.round(templateWidth / 4) : Math.round(templateHeight / 4),
        label: newGuideKey.trim(),
        color: availableColor,
        orientation: newGuideOrientation,
      },
    });

    setNewGuideKey('');
  };

  const renderGuideRow = (key: string, guide: GuidePreset) => {
    const maxPosition = guide.orientation === 'vertical' ? templateWidth : templateHeight;
    const dimension = guide.orientation === 'vertical' ? 'width' : 'height';

    return (
      <div
        key={key}
        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg group"
      >
        <GripVertical className="w-4 h-4 text-gray-300" />

        {/* Color picker */}
        <input
          type="color"
          value={guide.color}
          onChange={(e) => updateGuide(key, { color: e.target.value })}
          disabled={disabled}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200"
          title="Guide color"
        />

        {/* Label */}
        <input
          type="text"
          value={guide.label}
          onChange={(e) => updateGuide(key, { label: e.target.value })}
          disabled={disabled}
          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50"
          placeholder="Label"
        />

        {/* Position */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={guide.position}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              updateGuide(key, { position: Math.max(0, Math.min(val, maxPosition)) });
            }}
            disabled={disabled}
            min={0}
            max={maxPosition}
            className="w-20 px-2 py-1 text-sm text-right font-mono border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50"
          />
          <span className="text-xs text-gray-400">px</span>
        </div>

        {/* Orientation badge */}
        <span className={`
          flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
          ${guide.orientation === 'vertical' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}
        `}>
          {guide.orientation === 'vertical' ? (
            <ArrowUpDown className="w-3 h-3" />
          ) : (
            <ArrowRightLeft className="w-3 h-3" />
          )}
          {guide.orientation}
        </span>

        {/* Delete button */}
        <button
          onClick={() => removeGuide(key)}
          disabled={disabled}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
          title="Remove guide"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: `${templateWidth}/${templateHeight}` }}>
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          {templateWidth} x {templateHeight}px
        </div>

        {/* Render guide lines on preview */}
        {guideEntries.map(([key, guide]) => {
          const percentage = guide.orientation === 'vertical'
            ? (guide.position / templateWidth) * 100
            : (guide.position / templateHeight) * 100;

          return guide.orientation === 'vertical' ? (
            <div
              key={key}
              className="absolute top-0 bottom-0 w-0.5"
              style={{
                left: `${percentage}%`,
                backgroundColor: guide.color,
              }}
              title={`${guide.label}: ${guide.position}px`}
            />
          ) : (
            <div
              key={key}
              className="absolute left-0 right-0 h-0.5"
              style={{
                top: `${percentage}%`,
                backgroundColor: guide.color,
              }}
              title={`${guide.label}: ${guide.position}px`}
            />
          );
        })}
      </div>

      {/* Vertical Guides */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-blue-500" />
          Vertical Guides
          <span className="text-xs text-gray-400">({verticalGuides.length})</span>
        </h4>
        <div className="space-y-2">
          {verticalGuides.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">No vertical guides defined</p>
          ) : (
            verticalGuides.map(([key, guide]) => renderGuideRow(key, guide))
          )}
        </div>
      </div>

      {/* Horizontal Guides */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-amber-500" />
          Horizontal Guides
          <span className="text-xs text-gray-400">({horizontalGuides.length})</span>
        </h4>
        <div className="space-y-2">
          {horizontalGuides.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">No horizontal guides defined</p>
          ) : (
            horizontalGuides.map(([key, guide]) => renderGuideRow(key, guide))
          )}
        </div>
      </div>

      {/* Add new guide */}
      {!disabled && (
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Guide</h4>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newGuideKey}
              onChange={(e) => setNewGuideKey(e.target.value)}
              placeholder="Guide name (e.g., Logo Left)"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              onKeyDown={(e) => e.key === 'Enter' && addGuide()}
            />
            <select
              value={newGuideOrientation}
              onChange={(e) => setNewGuideOrientation(e.target.value as 'vertical' | 'horizontal')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
            </select>
            <button
              onClick={addGuide}
              disabled={!newGuideKey.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
