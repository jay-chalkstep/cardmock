/**
 * Prepaid Card Specifications and Guide Presets
 *
 * Industry-standard specifications for prepaid card design
 * at 300 DPI print quality.
 */

/**
 * Standard prepaid card physical and digital dimensions
 * CR80 standard: 3.375" × 2.125" (85.6mm × 53.98mm)
 */
export const PREPAID_CARD_SPECS = {
  // Pixel dimensions at 300 DPI (print quality)
  width: 1013,
  height: 638,
  dpi: 300,

  // Physical dimensions in millimeters
  physicalWidthMm: 85.6,
  physicalHeightMm: 53.98,

  // Physical dimensions in inches
  physicalWidthIn: 3.375,
  physicalHeightIn: 2.125,
};

/**
 * Standard aspect ratio for credit/prepaid cards (CR80)
 */
export const CARD_ASPECT_RATIO = 1.588; // width / height (1013/638)

/**
 * Guide type definition
 */
export interface Guide {
  id: string;
  position: number; // x for vertical guides, y for horizontal guides
  isPreset: boolean;
  color: string;
  label?: string;
}

/**
 * Colors for guide lines
 */
export const GUIDE_COLORS = {
  preset: '#22d3ee', // Cyan - for preset guides
  midpoint: '#f59e0b', // Amber - for midpoint/warning guides
  custom: '#a855f7', // Purple - for user-created guides
} as const;

/**
 * Prepaid card logo placement guides
 * These are industry-standard positions for logo placement
 * on prepaid cards at 300 DPI.
 */
export const PREPAID_LOGO_GUIDES = {
  vertical: [
    {
      id: 'preset-logo-left',
      position: 90, // px from left edge
      label: 'Logo Left',
      isPreset: true,
      color: GUIDE_COLORS.preset,
    },
    {
      id: 'preset-midpoint',
      position: 384, // px - card midpoint (logo should not extend past)
      label: 'Midpoint',
      isPreset: true,
      color: GUIDE_COLORS.midpoint,
    },
  ] as Guide[],
  horizontal: [
    {
      id: 'preset-logo-top',
      position: 107, // px from top edge
      label: 'Logo Top',
      isPreset: true,
      color: GUIDE_COLORS.preset,
    },
  ] as Guide[],
};

/**
 * Logo placement constraints for prepaid cards
 */
export const LOGO_CONSTRAINTS = {
  // Minimum distance from edges (in pixels at 300 DPI)
  minLeft: 90,
  minTop: 107,

  // Maximum right edge position (logo should not extend past midpoint)
  maxRight: 384,

  // Maximum logo width (midpoint - minLeft)
  maxWidth: 294, // 384 - 90
};

/**
 * Default guides for a new CardMock
 */
export const getDefaultGuides = (): { vertical: Guide[]; horizontal: Guide[] } => {
  return {
    vertical: [...PREPAID_LOGO_GUIDES.vertical],
    horizontal: [...PREPAID_LOGO_GUIDES.horizontal],
  };
};

/**
 * Create a new custom guide
 */
export const createCustomGuide = (
  type: 'vertical' | 'horizontal',
  position: number,
  label?: string
): Guide => {
  return {
    id: `custom-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position,
    isPreset: false,
    color: GUIDE_COLORS.custom,
    label: label || `${Math.round(position)}px`,
  };
};

/**
 * Scale guide positions from card coordinates to canvas coordinates
 *
 * @param guides - Guides in card coordinates (300 DPI)
 * @param canvasSize - Current canvas size (width for vertical, height for horizontal)
 * @param cardSize - Reference card size (PREPAID_CARD_SPECS.width or height)
 */
export const scaleGuidesToCanvas = (
  guides: Guide[],
  canvasSize: number,
  cardSize: number
): Guide[] => {
  const scale = canvasSize / cardSize;
  return guides.map(guide => ({
    ...guide,
    position: guide.position * scale,
  }));
};

/**
 * Scale guide positions from canvas coordinates to card coordinates
 *
 * @param guides - Guides in canvas coordinates
 * @param canvasSize - Current canvas size
 * @param cardSize - Reference card size (PREPAID_CARD_SPECS.width or height)
 */
export const scaleGuidesToCard = (
  guides: Guide[],
  canvasSize: number,
  cardSize: number
): Guide[] => {
  const scale = cardSize / canvasSize;
  return guides.map(guide => ({
    ...guide,
    position: guide.position * scale,
  }));
};

/**
 * Snap threshold in pixels (when within this range, snap to guide)
 */
export const SNAP_THRESHOLD = 8;

/**
 * Check if a position should snap to any guide
 *
 * @param position - Current position
 * @param guides - Array of guides to check against
 * @param threshold - Snap threshold in pixels
 * @returns The guide position to snap to, or null if no snap
 */
export const shouldSnapToGuide = (
  position: number,
  guides: Guide[],
  threshold: number = SNAP_THRESHOLD
): number | null => {
  for (const guide of guides) {
    if (Math.abs(position - guide.position) <= threshold) {
      return guide.position;
    }
  }
  return null;
};

/**
 * Find the nearest guide to a position
 *
 * @param position - Current position
 * @param guides - Array of guides to check against
 * @returns The nearest guide and distance, or null if no guides
 */
export const findNearestGuide = (
  position: number,
  guides: Guide[]
): { guide: Guide; distance: number } | null => {
  if (guides.length === 0) return null;

  let nearest: Guide | null = null;
  let minDistance = Infinity;

  for (const guide of guides) {
    const distance = Math.abs(position - guide.position);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = guide;
    }
  }

  return nearest ? { guide: nearest, distance: minDistance } : null;
};
