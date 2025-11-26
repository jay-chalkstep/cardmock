/**
 * Unit Conversion Utilities for Precision Tools
 *
 * Handles conversion between pixels, millimeters, and inches
 * based on DPI settings.
 */

export type Unit = 'px' | 'mm' | 'in';

/**
 * Convert pixels to millimeters
 * Formula: (px / dpi) * 25.4mm per inch
 */
export const pxToMm = (px: number, dpi: number = 300): number => {
  return (px / dpi) * 25.4;
};

/**
 * Convert pixels to inches
 * Formula: px / dpi
 */
export const pxToIn = (px: number, dpi: number = 300): number => {
  return px / dpi;
};

/**
 * Convert millimeters to pixels
 * Formula: (mm / 25.4mm per inch) * dpi
 */
export const mmToPx = (mm: number, dpi: number = 300): number => {
  return (mm / 25.4) * dpi;
};

/**
 * Convert inches to pixels
 * Formula: inches * dpi
 */
export const inToPx = (inches: number, dpi: number = 300): number => {
  return inches * dpi;
};

/**
 * Convert pixels to any unit
 */
export const pxToUnit = (px: number, unit: Unit, dpi: number = 300): number => {
  switch (unit) {
    case 'mm':
      return pxToMm(px, dpi);
    case 'in':
      return pxToIn(px, dpi);
    case 'px':
    default:
      return px;
  }
};

/**
 * Convert any unit to pixels
 */
export const unitToPx = (value: number, unit: Unit, dpi: number = 300): number => {
  switch (unit) {
    case 'mm':
      return mmToPx(value, dpi);
    case 'in':
      return inToPx(value, dpi);
    case 'px':
    default:
      return value;
  }
};

/**
 * Format a measurement value for display
 * - px: no decimal places
 * - mm: 1 decimal place
 * - in: 2 decimal places
 */
export const formatMeasurement = (value: number, unit: Unit): string => {
  switch (unit) {
    case 'mm':
      return value.toFixed(1);
    case 'in':
      return value.toFixed(2);
    case 'px':
    default:
      return Math.round(value).toString();
  }
};

/**
 * Get unit label for display
 */
export const getUnitLabel = (unit: Unit): string => {
  switch (unit) {
    case 'mm':
      return 'mm';
    case 'in':
      return 'in';
    case 'px':
    default:
      return 'px';
  }
};

/**
 * Calculate the scale factor for converting between design coordinates
 * and actual card dimensions
 *
 * @param canvasWidth - Current canvas width in pixels
 * @param cardWidthPx - Actual card width at target DPI (e.g., 1012px at 300 DPI)
 */
export const getScaleFactor = (canvasWidth: number, cardWidthPx: number): number => {
  return cardWidthPx / canvasWidth;
};

/**
 * Convert canvas position to actual card position
 */
export const canvasToCard = (
  canvasValue: number,
  canvasSize: number,
  cardSize: number
): number => {
  return (canvasValue / canvasSize) * cardSize;
};

/**
 * Convert actual card position to canvas position
 */
export const cardToCanvas = (
  cardValue: number,
  cardSize: number,
  canvasSize: number
): number => {
  return (cardValue / cardSize) * canvasSize;
};

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};
