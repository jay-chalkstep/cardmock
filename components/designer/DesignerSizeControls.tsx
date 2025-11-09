/**
 * Designer Size Controls Component
 * Contains size slider and aspect ratio toggle
 */

import { Lock, Unlock } from 'lucide-react';

interface DesignerSizeControlsProps {
  logoScale: number;
  keepAspectRatio: boolean;
  onScaleChange: (scale: number) => void;
  onAspectRatioToggle: () => void;
}

export default function DesignerSizeControls({
  logoScale,
  keepAspectRatio,
  onScaleChange,
  onAspectRatioToggle,
}: DesignerSizeControlsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Size</h3>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm text-gray-600">Logo Size</label>
            <span className="text-sm font-medium">{logoScale}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="50"
            value={logoScale}
            onChange={(e) => onScaleChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAspectRatioToggle}
            className="flex items-center gap-2 text-sm"
          >
            {keepAspectRatio ? (
              <Lock className="h-4 w-4 text-[#374151]" />
            ) : (
              <Unlock className="h-4 w-4 text-gray-400" />
            )}
            Aspect Ratio
          </button>
        </div>
      </div>
    </div>
  );
}

