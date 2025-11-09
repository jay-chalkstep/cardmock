'use client';

import { useState, useEffect } from 'react';
import { Maximize2, Minimize2, ArrowLeft, ArrowRight, X } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  imageUrl: string;
}

interface PresentationModeProps {
  assets: Asset[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  presenterNotes?: string;
}

export default function PresentationMode({
  assets,
  currentIndex,
  onIndexChange,
  onClose,
  presenterNotes,
}: PresentationModeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < assets.length - 1) {
        onIndexChange(currentIndex + 1);
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen(!isFullscreen);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, assets.length, isFullscreen, onClose, onIndexChange]);
  
  const currentAsset = assets[currentIndex];
  
  if (!currentAsset) {
    return null;
  }
  
  return (
    <div className={`fixed inset-0 bg-black z-50 ${isFullscreen ? '' : 'p-8'}`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black/50 text-white p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="text-sm">
            {currentIndex + 1} of {assets.length}
          </span>
          <span className="text-sm font-medium">{currentAsset.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {presenterNotes && (
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm"
            >
              {showNotes ? 'Hide' : 'Show'} Notes
            </button>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-white/20 rounded-lg"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex items-center justify-center h-full">
        <div className="relative max-w-full max-h-full">
          <img
            src={currentAsset.imageUrl}
            alt={currentAsset.name}
            className="max-w-full max-h-[calc(100vh-200px)] object-contain"
          />
        </div>
      </div>
      
      {/* Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4 flex items-center justify-center gap-4 z-10">
        <button
          onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="p-2 hover:bg-white/20 rounded-lg disabled:opacity-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm">
          Use arrow keys to navigate
        </span>
        <button
          onClick={() => onIndexChange(Math.min(assets.length - 1, currentIndex + 1))}
          disabled={currentIndex === assets.length - 1}
          className="p-2 hover:bg-white/20 rounded-lg disabled:opacity-50"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
      
      {/* Presenter Notes Panel */}
      {showNotes && presenterNotes && (
        <div className="absolute top-16 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-20">
          <h3 className="font-semibold text-gray-900 mb-2">Presenter Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{presenterNotes}</p>
        </div>
      )}
    </div>
  );
}

