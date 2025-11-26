'use client';

import React from 'react';
import { Group, Line, Rect, Text, Circle } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import type { Guide } from '@/lib/guidePresets';
import { PREPAID_CARD_SPECS } from '@/lib/guidePresets';

interface GuideLineOverlayProps {
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  // Guide lines (positions are in CANVAS coordinates for rendering)
  verticalGuides: Guide[];
  horizontalGuides: Guide[];
  // Visibility
  isVisible: boolean;
  // Callbacks
  onGuideMove?: (guideId: string, newPosition: number) => void;
  onGuideClick?: (guideId: string) => void;
  // Optional: highlight guide when snapping
  activeSnapGuideId?: string | null;
}

/**
 * GuideLineOverlay renders draggable guide lines on the canvas.
 *
 * IMPORTANT: Guide positions are received in canvas coordinates for rendering,
 * but labels display actual card coordinates (1012×637 at 300 DPI).
 *
 * Features:
 * - Vertical guides (full height, draggable left/right)
 * - Horizontal guides (full width, draggable up/down)
 * - Color-coded by type (preset cyan, midpoint amber, custom purple)
 * - Position labels showing card coordinates (not canvas coordinates)
 * - Drag handles for repositioning
 */
const GuideLineOverlay: React.FC<GuideLineOverlayProps> = ({
  canvasWidth,
  canvasHeight,
  verticalGuides,
  horizontalGuides,
  isVisible,
  onGuideMove,
  onGuideClick,
  activeSnapGuideId,
}) => {
  if (!isVisible) return null;

  // Scale factors to convert canvas coords to card coords (300 DPI)
  const scaleX = PREPAID_CARD_SPECS.width / canvasWidth;
  const scaleY = PREPAID_CARD_SPECS.height / canvasHeight;

  // Convert canvas position to card position (for display labels)
  const toCardX = (canvasPx: number) => Math.round(canvasPx * scaleX);
  const toCardY = (canvasPx: number) => Math.round(canvasPx * scaleY);

  const labelFontSize = 10;
  const labelPadding = 3;
  const labelHeight = labelFontSize + labelPadding * 2;
  const handleRadius = 6;

  // Helper to calculate label width
  const getLabelWidth = (text: string): number => {
    return text.length * 6 + labelPadding * 2;
  };

  // Render a vertical guide (full height line, position is x in canvas coords)
  const renderVerticalGuide = (guide: Guide) => {
    const isActive = activeSnapGuideId === guide.id;
    // Convert canvas position to card position for display
    const cardPosition = toCardX(guide.position);
    const labelText = `${cardPosition}px`;
    const labelWidth = getLabelWidth(labelText);

    return (
      <Group
        key={guide.id}
        x={guide.position}
        draggable={!guide.isPreset || true} // Allow dragging all guides
        onDragMove={(e: KonvaEventObject<DragEvent>) => {
          const newX = Math.max(0, Math.min(canvasWidth, e.target.x()));
          e.target.x(newX);
          e.target.y(0); // Keep vertical guides vertical
        }}
        onDragEnd={(e: KonvaEventObject<DragEvent>) => {
          const newPosition = Math.round(e.target.x());
          if (onGuideMove) {
            onGuideMove(guide.id, newPosition);
          }
        }}
        onClick={() => onGuideClick?.(guide.id)}
        onTap={() => onGuideClick?.(guide.id)}
      >
        {/* Guide line */}
        <Line
          points={[0, 0, 0, canvasHeight]}
          stroke={guide.color}
          strokeWidth={isActive ? 3 : 2}
          opacity={isActive ? 1 : 0.8}
        />

        {/* Drag handle at top */}
        <Circle
          x={0}
          y={handleRadius + 5}
          radius={handleRadius}
          fill={guide.color}
          stroke="#fff"
          strokeWidth={1}
          shadowColor="rgba(0,0,0,0.3)"
          shadowBlur={3}
          shadowOffset={{ x: 0, y: 1 }}
        />

        {/* Position label */}
        <Group x={5} y={handleRadius * 2 + 10}>
          <Rect
            width={labelWidth}
            height={labelHeight}
            fill="#0f172a"
            cornerRadius={3}
            opacity={0.9}
          />
          <Text
            text={labelText}
            fontSize={labelFontSize}
            fontFamily="monospace"
            fill={guide.color}
            width={labelWidth}
            height={labelHeight}
            align="center"
            verticalAlign="middle"
          />
        </Group>

        {/* Label for guide name (if preset) */}
        {guide.label && (
          <Group x={5} y={handleRadius * 2 + 10 + labelHeight + 3}>
            <Rect
              width={getLabelWidth(guide.label)}
              height={labelHeight}
              fill="#0f172a"
              cornerRadius={3}
              opacity={0.7}
            />
            <Text
              text={guide.label}
              fontSize={labelFontSize - 1}
              fontFamily="sans-serif"
              fill="#94a3b8"
              width={getLabelWidth(guide.label)}
              height={labelHeight}
              align="center"
              verticalAlign="middle"
            />
          </Group>
        )}
      </Group>
    );
  };

  // Render a horizontal guide (full width line, position is y in canvas coords)
  const renderHorizontalGuide = (guide: Guide) => {
    const isActive = activeSnapGuideId === guide.id;
    // Convert canvas position to card position for display
    const cardPosition = toCardY(guide.position);
    const labelText = `${cardPosition}px`;
    const labelWidth = getLabelWidth(labelText);

    return (
      <Group
        key={guide.id}
        y={guide.position}
        draggable={!guide.isPreset || true} // Allow dragging all guides
        onDragMove={(e: KonvaEventObject<DragEvent>) => {
          const newY = Math.max(0, Math.min(canvasHeight, e.target.y()));
          e.target.y(newY);
          e.target.x(0); // Keep horizontal guides horizontal
        }}
        onDragEnd={(e: KonvaEventObject<DragEvent>) => {
          const newPosition = Math.round(e.target.y());
          if (onGuideMove) {
            onGuideMove(guide.id, newPosition);
          }
        }}
        onClick={() => onGuideClick?.(guide.id)}
        onTap={() => onGuideClick?.(guide.id)}
      >
        {/* Guide line */}
        <Line
          points={[0, 0, canvasWidth, 0]}
          stroke={guide.color}
          strokeWidth={isActive ? 3 : 2}
          opacity={isActive ? 1 : 0.8}
        />

        {/* Drag handle at left */}
        <Circle
          x={handleRadius + 5}
          y={0}
          radius={handleRadius}
          fill={guide.color}
          stroke="#fff"
          strokeWidth={1}
          shadowColor="rgba(0,0,0,0.3)"
          shadowBlur={3}
          shadowOffset={{ x: 0, y: 1 }}
        />

        {/* Position label */}
        <Group x={handleRadius * 2 + 10} y={5}>
          <Rect
            width={labelWidth}
            height={labelHeight}
            fill="#0f172a"
            cornerRadius={3}
            opacity={0.9}
          />
          <Text
            text={labelText}
            fontSize={labelFontSize}
            fontFamily="monospace"
            fill={guide.color}
            width={labelWidth}
            height={labelHeight}
            align="center"
            verticalAlign="middle"
          />
        </Group>

        {/* Label for guide name (if preset) */}
        {guide.label && (
          <Group x={handleRadius * 2 + 10 + labelWidth + 5} y={5}>
            <Rect
              width={getLabelWidth(guide.label)}
              height={labelHeight}
              fill="#0f172a"
              cornerRadius={3}
              opacity={0.7}
            />
            <Text
              text={guide.label}
              fontSize={labelFontSize - 1}
              fontFamily="sans-serif"
              fill="#94a3b8"
              width={getLabelWidth(guide.label)}
              height={labelHeight}
              align="center"
              verticalAlign="middle"
            />
          </Group>
        )}
      </Group>
    );
  };

  return (
    <Group>
      {/* Render vertical guides */}
      {verticalGuides.map(renderVerticalGuide)}

      {/* Render horizontal guides */}
      {horizontalGuides.map(renderHorizontalGuide)}
    </Group>
  );
};

export default GuideLineOverlay;
