'use client';

import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CardMockPreviewProps {
  frontUrl?: string;
  backUrl?: string;
  currentSide: 'front' | 'back';
  onSideChange: (side: 'front' | 'back') => void;
  name: string;
}

export default function CardMockPreview({
  frontUrl,
  backUrl,
  currentSide,
  onSideChange,
  name,
}: CardMockPreviewProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);

  const currentUrl = currentSide === 'front' ? frontUrl : backUrl;
  const hasBack = !!backUrl;

  return (
    <div className="flex-1 flex flex-col">
      {/* Preview Container */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Checkerboard background for transparency */}
        <div
          className="absolute inset-8 rounded-lg"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #e5e5e5 25%, transparent 25%),
              linear-gradient(-45deg, #e5e5e5 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #e5e5e5 75%),
              linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        />

        {/* Image */}
        <div className="relative z-10 max-w-full max-h-full p-8">
          {currentUrl && !imageError ? (
            <img
              src={currentUrl}
              alt={`${name} - ${currentSide}`}
              className={`max-w-full max-h-[50vh] object-contain rounded-lg shadow-lg transition-transform duration-300 ${
                isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-64 h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-4xl font-bold text-gray-400">
                {name[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 rounded-lg shadow-sm p-1">
          <button
            onClick={() => setIsZoomed(false)}
            className={`p-1.5 rounded transition-colors ${
              !isZoomed ? 'bg-gray-100' : 'hover:bg-gray-100'
            }`}
            title="Fit to view"
          >
            <ZoomOut size={16} className="text-gray-600" />
          </button>
          <button
            onClick={() => setIsZoomed(true)}
            className={`p-1.5 rounded transition-colors ${
              isZoomed ? 'bg-gray-100' : 'hover:bg-gray-100'
            }`}
            title="Zoom in"
          >
            <ZoomIn size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Front/Back Toggle */}
      {hasBack && (
        <div className="flex justify-center pt-4">
          <div className="inline-flex bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-1">
            <button
              onClick={() => onSideChange('front')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                currentSide === 'front'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              Front
            </button>
            <button
              onClick={() => onSideChange('back')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                currentSide === 'back'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
