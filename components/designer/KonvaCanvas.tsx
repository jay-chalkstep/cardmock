'use client';

import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Stage, Layer, Image, Transformer, Line } from 'react-konva';
import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import MeasurementOverlay from './MeasurementOverlay';
import GuideLineOverlay from './GuideLineOverlay';
import type { Guide } from '@/lib/guidePresets';

interface KonvaCanvasProps {
  width: number;
  height: number;
  templateImage: HTMLImageElement | null;
  logoImage: HTMLImageElement | null;
  logoPosition: { x: number; y: number };
  logoSize: { width: number; height: number };
  isSelected: boolean;
  showGrid: boolean;
  keepAspectRatio: boolean;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onTransformEnd: () => void;
  onClick: () => void;
  onDeselect: () => void;
  // Precision tools props
  showMeasurements?: boolean;
  showGuides?: boolean;
  verticalGuides?: Guide[];
  horizontalGuides?: Guide[];
  onGuideMove?: (guideId: string, newPosition: number) => void;
  activeSnapGuideId?: string | null;
  // Drag callback for real-time updates
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
}

export interface KonvaCanvasRef {
  getStage: () => Konva.Stage | null;
  getLogoNode: () => Konva.Image | null;
  toDataURL: (config?: { mimeType?: string; quality?: number; pixelRatio?: number }) => string | undefined;
  toDataURLClean: (config?: { mimeType?: string; quality?: number; pixelRatio?: number }) => string | undefined;
}

const KonvaCanvas = forwardRef<KonvaCanvasRef, KonvaCanvasProps>((props, ref) => {
  const {
    width,
    height,
    templateImage,
    logoImage,
    logoPosition,
    logoSize,
    isSelected,
    showGrid,
    keepAspectRatio,
    onDragEnd,
    onTransformEnd,
    onClick,
    onDeselect,
    // Precision tools props
    showMeasurements = false,
    showGuides = false,
    verticalGuides = [],
    horizontalGuides = [],
    onGuideMove,
    activeSnapGuideId = null,
    onDragMove,
  } = props;

  const stageRef = useRef<Konva.Stage>(null);
  const logoRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    getLogoNode: () => logoRef.current,
    toDataURL: (config?: { mimeType?: string; quality?: number; pixelRatio?: number }) => {
      if (stageRef.current) {
        return stageRef.current.toDataURL(config);
      }
      return undefined;
    },
    toDataURLClean: (config?: { mimeType?: string; quality?: number; pixelRatio?: number }) => {
      if (stageRef.current) {
        // Temporarily hide transformer and grid for clean export
        const wasSelected = isSelected;
        const wasShowingGrid = showGrid;

        // Hide transformer by deselecting
        if (wasSelected && transformerRef.current) {
          transformerRef.current.nodes([]);
          transformerRef.current.getLayer()?.batchDraw();
        }

        // Get the stage data URL without UI elements
        // Note: Grid is rendered conditionally based on showGrid prop,
        // so we can't directly hide it here. Parent must handle grid state.
        const dataURL = stageRef.current.toDataURL(config);

        // Restore transformer if it was selected
        if (wasSelected && logoRef.current && transformerRef.current) {
          transformerRef.current.nodes([logoRef.current]);
          transformerRef.current.getLayer()?.batchDraw();
        }

        return dataURL;
      }
      return undefined;
    }
  }));

  // Update transformer when selection changes
  useEffect(() => {
    if (isSelected && logoRef.current && transformerRef.current) {
      transformerRef.current.nodes([logoRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Handle deselect when clicking on empty area
  const handleStageClick = (e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      onDeselect();
    }
  };

  // Handle transform end
  const handleTransformEnd = () => {
    if (!logoRef.current) return;

    const node = logoRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply it to width/height
    node.scaleX(1);
    node.scaleY(1);

    const newWidth = Math.max(5, node.width() * scaleX);
    const newHeight = Math.max(5, node.height() * scaleY);

    node.width(newWidth);
    node.height(newHeight);

    onTransformEnd();
  };

  return (
    <Stage
      width={width}
      height={height}
      ref={stageRef}
      onMouseDown={handleStageClick}
      onTouchStart={handleStageClick}
    >
      <Layer>
        {/* Card Template Background */}
        {templateImage && (
          <Image
            image={templateImage}
            width={width}
            height={height}
            cornerRadius={width * 0.025} // 2.5% of width for proportional rounded corners
          />
        )}

        {/* Grid Overlay */}
        {showGrid && (
          <>
            {/* Vertical lines */}
            {[...Array(10)].map((_, i) => (
              <Line
                key={`v-${i}`}
                points={[
                  (width / 10) * (i + 1),
                  0,
                  (width / 10) * (i + 1),
                  height
                ]}
                stroke="rgba(0,0,0,0.1)"
                strokeWidth={1}
              />
            ))}
            {/* Horizontal lines */}
            {[...Array(6)].map((_, i) => (
              <Line
                key={`h-${i}`}
                points={[
                  0,
                  (height / 6) * (i + 1),
                  width,
                  (height / 6) * (i + 1)
                ]}
                stroke="rgba(0,0,0,0.1)"
                strokeWidth={1}
              />
            ))}
          </>
        )}
      </Layer>

      <Layer>
        {/* Logo */}
        {logoImage && (
          <>
            <Image
              ref={logoRef}
              image={logoImage}
              x={logoPosition.x}
              y={logoPosition.y}
              width={logoSize.width}
              height={logoSize.height}
              draggable
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
              onTransformEnd={handleTransformEnd}
              onClick={onClick}
              onTap={onClick}
            />
            {isSelected && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  // Limit resize
                  if (newBox.width < 20 || newBox.height < 20) {
                    return oldBox;
                  }
                  return newBox;
                }}
                keepRatio={keepAspectRatio}
                rotateEnabled={false}
              />
            )}
          </>
        )}
      </Layer>

      {/* Precision Tools Overlay Layer */}
      <Layer listening={false}>
        {/* Measurement lines (from element to edges) */}
        {logoImage && (
          <MeasurementOverlay
            elementX={logoPosition.x}
            elementY={logoPosition.y}
            elementWidth={logoSize.width}
            elementHeight={logoSize.height}
            canvasWidth={width}
            canvasHeight={height}
            isVisible={showMeasurements && isSelected}
          />
        )}
      </Layer>

      {/* Guide Lines Layer (interactive - allows dragging) */}
      <Layer>
        <GuideLineOverlay
          canvasWidth={width}
          canvasHeight={height}
          verticalGuides={verticalGuides}
          horizontalGuides={horizontalGuides}
          isVisible={showGuides}
          onGuideMove={onGuideMove}
          activeSnapGuideId={activeSnapGuideId}
        />
      </Layer>
    </Stage>
  );
});

KonvaCanvas.displayName = 'KonvaCanvas';

export default KonvaCanvas;