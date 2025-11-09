'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  imageUrl: string;
}

interface ComparisonViewProps {
  assets: Asset[];
  mode: 'side_by_side' | 'overlay' | 'timeline' | 'grid';
  onAssetSelect?: (assetId: string) => void;
}

export default function ComparisonView({
  assets,
  mode,
  onAssetSelect,
}: ComparisonViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < assets.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, assets.length]);
  
  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No assets selected for comparison
      </div>
    );
  }
  
  if (mode === 'side_by_side') {
    const maxAssets = Math.min(assets.length, 4);
    const displayAssets = assets.slice(0, maxAssets);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale(Math.max(0.5, scale - 0.25))}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(Math.min(2.0, scale + 0.25))}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
        
        <div className={`grid grid-cols-${maxAssets} gap-4 ${isFullscreen ? 'fixed inset-0 bg-white z-50 p-8' : ''}`}>
          {displayAssets.map((asset) => (
            <div key={asset.id} className="space-y-2">
              <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <img
                  src={asset.imageUrl}
                  alt={asset.name}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-sm font-medium text-gray-900 text-center">{asset.name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (mode === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            onClick={() => onAssetSelect?.(asset.id)}
            className="cursor-pointer rounded-lg border border-gray-200 hover:border-blue-500 transition-colors overflow-hidden"
          >
            <img
              src={asset.imageUrl}
              alt={asset.name}
              className="w-full h-48 object-cover"
            />
            <p className="p-2 text-sm font-medium text-gray-900 truncate">{asset.name}</p>
          </div>
        ))}
      </div>
    );
  }
  
  // Timeline or overlay mode - show one at a time with navigation
  const currentAsset = assets[currentIndex];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">
            {currentIndex + 1} of {assets.length}
          </span>
          <button
            onClick={() => setCurrentIndex(Math.min(assets.length - 1, currentIndex + 1))}
            disabled={currentIndex === assets.length - 1}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      
      <div className={`bg-gray-100 rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        {currentAsset && (
          <img
            src={currentAsset.imageUrl}
            alt={currentAsset.name}
            className="w-full h-auto"
          />
        )}
      </div>
      
      {currentAsset && (
        <p className="text-sm font-medium text-gray-900 text-center">{currentAsset.name}</p>
      )}
    </div>
  );
}

