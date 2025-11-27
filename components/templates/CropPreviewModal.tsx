'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Check, Move } from 'lucide-react';
import { CropRect, loadImage } from '@/lib/imageProcessor';
import { CR80_SPECS } from '@/lib/templateNormalization';

interface CropPreviewModalProps {
  isOpen: boolean;
  file: File;
  initialCropRect: CropRect;
  originalDimensions: { width: number; height: number };
  onConfirm: (cropRect: CropRect) => void;
  onCancel: () => void;
}

export default function CropPreviewModal({
  isOpen,
  file,
  initialCropRect,
  originalDimensions,
  onConfirm,
  onCancel,
}: CropPreviewModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<CropRect>(initialCropRect);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(1);

  // Calculate display scale to fit the preview in the modal
  const MAX_PREVIEW_WIDTH = 700;
  const MAX_PREVIEW_HEIGHT = 500;

  useEffect(() => {
    if (!isOpen || !file) return;

    setLoading(true);
    setCropRect(initialCropRect);

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Calculate scale to fit in preview area
    const scaleX = MAX_PREVIEW_WIDTH / originalDimensions.width;
    const scaleY = MAX_PREVIEW_HEIGHT / originalDimensions.height;
    setDisplayScale(Math.min(scaleX, scaleY, 1)); // Never upscale for preview

    setLoading(false);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isOpen, file, initialCropRect, originalDimensions]);

  // Scale values for display
  const displayWidth = originalDimensions.width * displayScale;
  const displayHeight = originalDimensions.height * displayScale;
  const scaledCrop = {
    x: cropRect.x * displayScale,
    y: cropRect.y * displayScale,
    width: cropRect.width * displayScale,
    height: cropRect.height * displayScale,
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drag if clicking inside the crop area
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Check if mouse is inside crop area
      if (
        mouseX >= scaledCrop.x &&
        mouseX <= scaledCrop.x + scaledCrop.width &&
        mouseY >= scaledCrop.y &&
        mouseY <= scaledCrop.y + scaledCrop.height
      ) {
        setIsDragging(true);
        setDragStart({
          x: mouseX - scaledCrop.x,
          y: mouseY - scaledCrop.y,
        });
        e.preventDefault();
      }
    },
    [scaledCrop]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate new position in display coordinates
      let newX = mouseX - dragStart.x;
      let newY = mouseY - dragStart.y;

      // Clamp to bounds (in display coordinates)
      newX = Math.max(0, Math.min(newX, displayWidth - scaledCrop.width));
      newY = Math.max(0, Math.min(newY, displayHeight - scaledCrop.height));

      // Convert back to original coordinates
      setCropRect((prev) => ({
        ...prev,
        x: Math.round(newX / displayScale),
        y: Math.round(newY / displayScale),
      }));
    },
    [isDragging, dragStart, displayScale, displayWidth, displayHeight, scaledCrop.width, scaledCrop.height]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-[850px] w-full max-h-[90vh] overflow-hidden m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Adjust Crop Area</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Drag the highlighted area to choose what to keep
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dimension info */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">
                    Original: {originalDimensions.width} × {originalDimensions.height}px
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-500">
                    Crop to: {cropRect.width} × {cropRect.height}px
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600 font-medium">
                    Final: {CR80_SPECS.DPI_300.width} × {CR80_SPECS.DPI_300.height}px
                  </span>
                </div>
              </div>

              {/* Preview container */}
              <div
                ref={containerRef}
                className="relative mx-auto select-none"
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  cursor: isDragging ? 'grabbing' : 'default',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* Base image */}
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Template preview"
                    className="absolute inset-0 w-full h-full object-contain"
                    draggable={false}
                  />
                )}

                {/* Dark overlay for cropped areas */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${displayWidth} ${displayHeight}`}
                >
                  {/* Semi-transparent overlay with cutout */}
                  <defs>
                    <mask id="cropMask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect
                        x={scaledCrop.x}
                        y={scaledCrop.y}
                        width={scaledCrop.width}
                        height={scaledCrop.height}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.5)"
                    mask="url(#cropMask)"
                  />
                </svg>

                {/* Crop area border */}
                <div
                  className="absolute border-2 border-green-500 border-dashed pointer-events-none"
                  style={{
                    left: scaledCrop.x,
                    top: scaledCrop.y,
                    width: scaledCrop.width,
                    height: scaledCrop.height,
                  }}
                >
                  {/* Corner handles (visual only) */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-green-500 rounded-sm" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-green-500 rounded-sm" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-green-500 rounded-sm" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-green-500 rounded-sm" />
                </div>

                {/* Drag handle in center */}
                <div
                  className="absolute flex items-center justify-center bg-white/90 rounded-lg px-3 py-2 shadow-lg cursor-grab active:cursor-grabbing"
                  style={{
                    left: scaledCrop.x + scaledCrop.width / 2 - 50,
                    top: scaledCrop.y + scaledCrop.height / 2 - 16,
                    width: 100,
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <Move className="h-4 w-4 text-gray-600 mr-1.5" />
                  <span className="text-xs font-medium text-gray-600">Drag to move</span>
                </div>
              </div>

              {/* Instructions */}
              <p className="text-xs text-gray-400 text-center">
                The darkened areas will be cropped. Drag the selection to adjust positioning.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(cropRect)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Apply Crop & Normalize
          </button>
        </div>
      </div>
    </div>
  );
}
