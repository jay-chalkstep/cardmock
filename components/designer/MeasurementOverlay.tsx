'use client';

import React from 'react';
import { Group, Line, Rect, Text } from 'react-konva';
import { PREPAID_CARD_SPECS } from '@/lib/guidePresets';

interface MeasurementOverlayProps {
  // Element position and size (in canvas pixels)
  elementX: number;
  elementY: number;
  elementWidth: number;
  elementHeight: number;
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  // Whether to show measurements
  isVisible: boolean;
}

/**
 * MeasurementOverlay displays visual measurement guides on the canvas
 * showing the distance from the selected element to the card edges.
 *
 * IMPORTANT: Labels show actual card coordinates (1012×637 at 300 DPI),
 * not canvas display coordinates.
 *
 * Features:
 * - Dashed lines from element edges to canvas edges
 * - Measurement labels (pills) showing pixel values in card coordinates
 * - Cyan color scheme matching professional design tools
 */
const MeasurementOverlay: React.FC<MeasurementOverlayProps> = ({
  elementX,
  elementY,
  elementWidth,
  elementHeight,
  canvasWidth,
  canvasHeight,
  isVisible,
}) => {
  if (!isVisible) return null;

  // Scale factors to convert canvas coords to card coords (300 DPI)
  const scaleX = PREPAID_CARD_SPECS.width / canvasWidth;
  const scaleY = PREPAID_CARD_SPECS.height / canvasHeight;

  // Convert canvas position to card position (for display labels)
  const toCardX = (canvasPx: number) => Math.round(canvasPx * scaleX);
  const toCardY = (canvasPx: number) => Math.round(canvasPx * scaleY);

  // Colors
  const lineColor = '#22d3ee'; // Cyan
  const labelBgColor = '#0f172a'; // Dark slate
  const labelTextColor = '#22d3ee'; // Cyan

  // Measurement values in CARD coordinates (1012×637)
  const leftDistance = toCardX(elementX);
  const topDistance = toCardY(elementY);
  const rightDistance = toCardX(canvasWidth - elementX - elementWidth);
  const bottomDistance = toCardY(canvasHeight - elementY - elementHeight);

  // Label styling
  const labelFontSize = 11;
  const labelPadding = 4;
  const labelHeight = labelFontSize + labelPadding * 2;

  // Helper to calculate label width based on text
  const getLabelWidth = (value: number): number => {
    const textLength = value.toString().length + 2; // +2 for "px"
    return textLength * 7 + labelPadding * 2;
  };

  // Calculate positions for measurement lines (in canvas coords for rendering)
  const elementCenterY = elementY + elementHeight / 2;
  const elementCenterX = elementX + elementWidth / 2;

  return (
    <Group>
      {/* Left measurement line (horizontal) */}
      {leftDistance > 0 && (
        <Group>
          {/* Dashed line from element left edge to canvas left edge */}
          <Line
            points={[0, elementCenterY, elementX, elementCenterY]}
            stroke={lineColor}
            strokeWidth={1}
            dash={[4, 4]}
          />
          {/* Label pill */}
          <Group x={elementX / 2 - getLabelWidth(leftDistance) / 2} y={elementCenterY - labelHeight / 2 - 10}>
            <Rect
              width={getLabelWidth(leftDistance)}
              height={labelHeight}
              fill={labelBgColor}
              cornerRadius={4}
            />
            <Text
              text={`${leftDistance}px`}
              fontSize={labelFontSize}
              fontFamily="monospace"
              fill={labelTextColor}
              width={getLabelWidth(leftDistance)}
              height={labelHeight}
              align="center"
              verticalAlign="middle"
            />
          </Group>
        </Group>
      )}

      {/* Top measurement line (vertical) */}
      {topDistance > 0 && (
        <Group>
          {/* Dashed line from element top edge to canvas top edge */}
          <Line
            points={[elementCenterX, 0, elementCenterX, elementY]}
            stroke={lineColor}
            strokeWidth={1}
            dash={[4, 4]}
          />
          {/* Label pill */}
          <Group x={elementCenterX + 10} y={elementY / 2 - labelHeight / 2}>
            <Rect
              width={getLabelWidth(topDistance)}
              height={labelHeight}
              fill={labelBgColor}
              cornerRadius={4}
            />
            <Text
              text={`${topDistance}px`}
              fontSize={labelFontSize}
              fontFamily="monospace"
              fill={labelTextColor}
              width={getLabelWidth(topDistance)}
              height={labelHeight}
              align="center"
              verticalAlign="middle"
            />
          </Group>
        </Group>
      )}

      {/* Right measurement line (horizontal) */}
      {rightDistance > 0 && (
        <Group>
          {/* Dashed line from element right edge to canvas right edge */}
          <Line
            points={[elementX + elementWidth, elementCenterY, canvasWidth, elementCenterY]}
            stroke={lineColor}
            strokeWidth={1}
            dash={[4, 4]}
          />
          {/* Label pill */}
          <Group
            x={elementX + elementWidth + ((canvasWidth - elementX - elementWidth) / 2) - getLabelWidth(rightDistance) / 2}
            y={elementCenterY - labelHeight / 2 + 10}
          >
            <Rect
              width={getLabelWidth(rightDistance)}
              height={labelHeight}
              fill={labelBgColor}
              cornerRadius={4}
            />
            <Text
              text={`${rightDistance}px`}
              fontSize={labelFontSize}
              fontFamily="monospace"
              fill={labelTextColor}
              width={getLabelWidth(rightDistance)}
              height={labelHeight}
              align="center"
              verticalAlign="middle"
            />
          </Group>
        </Group>
      )}

      {/* Bottom measurement line (vertical) */}
      {bottomDistance > 0 && (
        <Group>
          {/* Dashed line from element bottom edge to canvas bottom edge */}
          <Line
            points={[elementCenterX, elementY + elementHeight, elementCenterX, canvasHeight]}
            stroke={lineColor}
            strokeWidth={1}
            dash={[4, 4]}
          />
          {/* Label pill */}
          <Group
            x={elementCenterX - 10 - getLabelWidth(bottomDistance)}
            y={elementY + elementHeight + ((canvasHeight - elementY - elementHeight) / 2) - labelHeight / 2}
          >
            <Rect
              width={getLabelWidth(bottomDistance)}
              height={labelHeight}
              fill={labelBgColor}
              cornerRadius={4}
            />
            <Text
              text={`${bottomDistance}px`}
              fontSize={labelFontSize}
              fontFamily="monospace"
              fill={labelTextColor}
              width={getLabelWidth(bottomDistance)}
              height={labelHeight}
              align="center"
              verticalAlign="middle"
            />
          </Group>
        </Group>
      )}
    </Group>
  );
};

export default MeasurementOverlay;
