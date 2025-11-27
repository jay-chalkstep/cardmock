/**
 * Template Normalization Utilities
 *
 * Handles classification and normalization of uploaded card templates
 * to conform to various template type specifications (CR80, Apple Wallet, etc.).
 */

import {
  TemplateTypeId,
  TemplateType,
  TEMPLATE_TYPES,
  getTemplateType,
  analyzeUpload as analyzeUploadForType,
  UploadAnalysis,
  UploadStatus,
  UploadQuality,
  CropRect,
} from './templateTypes';

// Re-export for backwards compatibility
export { analyzeUploadForType, UploadAnalysis, UploadStatus, UploadQuality, CropRect };
export type { TemplateTypeId, TemplateType };

/**
 * CR80 Prepaid Card Specifications
 * Physical size: 3.375" × 2.125" (85.6mm × 53.98mm)
 */
export const CR80_SPECS = {
  // 300 DPI dimensions (standard print quality)
  DPI_300: {
    width: TEMPLATE_TYPES['prepaid-cr80'].width,
    height: TEMPLATE_TYPES['prepaid-cr80'].height,
    dpi: 300,
  },
  // 600 DPI dimensions (high quality)
  DPI_600: {
    width: 2026,
    height: 1276,
    dpi: 600,
  },
  // Target aspect ratio (width / height)
  ASPECT_RATIO: TEMPLATE_TYPES['prepaid-cr80'].aspectRatio,
  // Tolerance for aspect ratio matching (±0.5%)
  ASPECT_RATIO_TOLERANCE: 0.005,
  // Physical dimensions
  PHYSICAL: {
    widthInches: 3.375,
    heightInches: 2.125,
    widthMm: 85.6,
    heightMm: 53.98,
  },
} as const;

/**
 * Classification states for uploaded templates
 */
export type TemplateClassification =
  | 'exact_300'           // Already 1013×638, accept as-is
  | 'exact_600'           // Already 2026×1276, accept as-is
  | 'correct_ratio_oversized'  // Aspect ratio is correct, needs resize
  | 'correct_ratio_undersized' // Aspect ratio is correct, smaller than standard
  | 'wrong_ratio'         // Aspect ratio is off, needs crop + resize
  | 'too_small'           // Smaller than 1013×638, warn about quality loss
  | 'not_a_card';         // Aspect ratio is wildly off (portrait, square, etc.)

/**
 * Result of template classification
 */
export interface ClassificationResult {
  classification: TemplateClassification;
  originalDimensions: {
    width: number;
    height: number;
  };
  aspectRatio: number;
  targetAspectRatio: number;
  ratioDeviation: number; // How far off from target ratio (as percentage)
  cropNeeded?: {
    direction: 'width' | 'height';
    amountPx: number;
    cropRect: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  qualityWarning?: string;
  message: string;
  actionButtons: ActionButton[];
}

export interface ActionButton {
  label: string;
  action: 'normalize' | 'preview_crop' | 'keep_original' | 'upscale' | 'upload_different' | 'use_anyway';
  variant: 'primary' | 'secondary' | 'warning';
}

/**
 * Check if an aspect ratio is within acceptable tolerance of target
 */
export function isAspectRatioAcceptable(aspectRatio: number): boolean {
  const deviation = Math.abs(aspectRatio - CR80_SPECS.ASPECT_RATIO) / CR80_SPECS.ASPECT_RATIO;
  return deviation <= CR80_SPECS.ASPECT_RATIO_TOLERANCE;
}

/**
 * Check if the image appears to be a card template (landscape with reasonable ratio)
 * Portrait images or extreme ratios are likely not card templates
 */
export function looksLikeCardTemplate(width: number, height: number): boolean {
  // Must be landscape
  if (height >= width) return false;

  const aspectRatio = width / height;

  // Accept ratios between 1.3 and 2.0 (cards are typically around 1.59)
  // This gives a wide margin for marketing materials that might be cropped
  return aspectRatio >= 1.3 && aspectRatio <= 2.0;
}

/**
 * Calculate the crop needed to achieve correct aspect ratio
 */
export function calculateCrop(width: number, height: number): {
  direction: 'width' | 'height';
  amountPx: number;
  cropRect: { x: number; y: number; width: number; height: number };
} {
  const currentRatio = width / height;
  const targetRatio = CR80_SPECS.ASPECT_RATIO;

  if (currentRatio > targetRatio) {
    // Image is too wide for its height - crop width
    const targetWidth = Math.round(height * targetRatio);
    const cropAmount = width - targetWidth;
    const cropX = Math.round(cropAmount / 2); // Center crop

    return {
      direction: 'width',
      amountPx: cropAmount,
      cropRect: {
        x: cropX,
        y: 0,
        width: targetWidth,
        height: height,
      },
    };
  } else {
    // Image is too tall for its width - crop height
    const targetHeight = Math.round(width / targetRatio);
    const cropAmount = height - targetHeight;
    const cropY = Math.round(cropAmount / 2); // Center crop

    return {
      direction: 'height',
      amountPx: cropAmount,
      cropRect: {
        x: 0,
        y: cropY,
        width: width,
        height: targetHeight,
      },
    };
  }
}

/**
 * Classify an uploaded template based on its dimensions
 */
export function classifyTemplate(width: number, height: number): ClassificationResult {
  const aspectRatio = width / height;
  const ratioDeviation = Math.abs(aspectRatio - CR80_SPECS.ASPECT_RATIO) / CR80_SPECS.ASPECT_RATIO;

  const baseResult = {
    originalDimensions: { width, height },
    aspectRatio,
    targetAspectRatio: CR80_SPECS.ASPECT_RATIO,
    ratioDeviation,
  };

  // Check for exact 300 DPI match
  if (width === CR80_SPECS.DPI_300.width && height === CR80_SPECS.DPI_300.height) {
    return {
      ...baseResult,
      classification: 'exact_300',
      message: `Perfect! Your template is exactly ${width}×${height}px (300 DPI CR80 standard).`,
      actionButtons: [
        { label: 'Upload', action: 'keep_original', variant: 'primary' },
      ],
    };
  }

  // Check for exact 600 DPI match
  if (width === CR80_SPECS.DPI_600.width && height === CR80_SPECS.DPI_600.height) {
    return {
      ...baseResult,
      classification: 'exact_600',
      message: `Perfect! Your template is exactly ${width}×${height}px (600 DPI CR80 standard). It will be scaled to 300 DPI for consistency.`,
      actionButtons: [
        { label: 'Normalize to 300 DPI', action: 'normalize', variant: 'primary' },
        { label: 'Keep Original', action: 'keep_original', variant: 'secondary' },
      ],
    };
  }

  // Check if it doesn't look like a card template at all
  if (!looksLikeCardTemplate(width, height)) {
    const ratioDisplay = aspectRatio.toFixed(2);
    const isPortrait = height > width;

    return {
      ...baseResult,
      classification: 'not_a_card',
      message: isPortrait
        ? `This image appears to be portrait orientation (${width}×${height}px). CR80 cards are landscape with ~1.59:1 ratio.`
        : `This image has an unusual aspect ratio (${ratioDisplay}:1). CR80 prepaid cards are typically 1.59:1.`,
      actionButtons: [
        { label: 'Use Anyway', action: 'use_anyway', variant: 'warning' },
        { label: 'Upload Different File', action: 'upload_different', variant: 'secondary' },
      ],
    };
  }

  // Check if too small (smaller than 300 DPI standard)
  const isTooSmall = width < CR80_SPECS.DPI_300.width || height < CR80_SPECS.DPI_300.height;

  // Check if aspect ratio is acceptable
  const ratioIsCorrect = isAspectRatioAcceptable(aspectRatio);

  if (isTooSmall) {
    const scaleFactor = Math.max(
      CR80_SPECS.DPI_300.width / width,
      CR80_SPECS.DPI_300.height / height
    );

    return {
      ...baseResult,
      classification: 'too_small',
      qualityWarning: `Upscaling by ${scaleFactor.toFixed(1)}x may reduce print quality.`,
      message: `Your template is ${width}×${height}px, smaller than the ${CR80_SPECS.DPI_300.width}×${CR80_SPECS.DPI_300.height}px standard.`,
      actionButtons: [
        { label: 'Upscale Anyway', action: 'upscale', variant: 'warning' },
        { label: 'Upload Different File', action: 'upload_different', variant: 'secondary' },
      ],
      cropNeeded: ratioIsCorrect ? undefined : calculateCrop(width, height),
    };
  }

  if (ratioIsCorrect) {
    // Correct ratio, just needs resize
    return {
      ...baseResult,
      classification: 'correct_ratio_oversized',
      message: `Your template is ${width}×${height}px. Standard CR80 prepaid cards are ${CR80_SPECS.DPI_300.width}×${CR80_SPECS.DPI_300.height}px at 300 DPI.`,
      actionButtons: [
        { label: 'Normalize to 300 DPI', action: 'normalize', variant: 'primary' },
        { label: 'Keep Original', action: 'keep_original', variant: 'secondary' },
      ],
    };
  }

  // Wrong ratio - needs crop and resize
  const cropInfo = calculateCrop(width, height);
  const cropDirection = cropInfo.direction === 'width' ? 'sides' : 'top/bottom';

  return {
    ...baseResult,
    classification: 'wrong_ratio',
    cropNeeded: cropInfo,
    message: `Your template is ${width}×${height}px (${aspectRatio.toFixed(3)}:1 ratio). CR80 cards are ${CR80_SPECS.ASPECT_RATIO}:1. I'll crop ${cropInfo.amountPx}px from the ${cropDirection} to fit.`,
    actionButtons: [
      { label: 'Preview Crop', action: 'preview_crop', variant: 'primary' },
      { label: 'Normalize', action: 'normalize', variant: 'secondary' },
      { label: 'Keep Original', action: 'keep_original', variant: 'secondary' },
    ],
  };
}

/**
 * Get image dimensions from a File object
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Format a ratio as a human-readable string
 */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Calculate the deviation percentage from target ratio
 */
export function getRatioDeviationPercent(aspectRatio: number): number {
  return Math.abs(aspectRatio - CR80_SPECS.ASPECT_RATIO) / CR80_SPECS.ASPECT_RATIO * 100;
}

// ============================================================================
// MULTI-TYPE NORMALIZATION UTILITIES
// ============================================================================

/**
 * Analyze upload for a specific template type (wrapper for backwards compatibility)
 */
export function analyzeForTemplateType(
  width: number,
  height: number,
  templateTypeId: TemplateTypeId = 'prepaid-cr80'
): UploadAnalysis {
  return analyzeUploadForType(width, height, templateTypeId);
}

/**
 * Get the best matching template type for an uploaded image
 * Returns the template type that requires the least modification
 */
export function suggestTemplateType(width: number, height: number): {
  suggested: TemplateTypeId;
  analysis: UploadAnalysis;
  alternatives: Array<{ typeId: TemplateTypeId; analysis: UploadAnalysis }>;
} {
  const analyses: Array<{ typeId: TemplateTypeId; analysis: UploadAnalysis }> = [];

  // Analyze for each template type
  for (const typeId of Object.keys(TEMPLATE_TYPES) as TemplateTypeId[]) {
    analyses.push({
      typeId,
      analysis: analyzeUploadForType(width, height, typeId),
    });
  }

  // Sort by best match (exact > correct_ratio > wrong_ratio > too_small > not_compatible)
  const statusPriority: Record<UploadStatus, number> = {
    exact: 0,
    correct_ratio: 1,
    wrong_ratio: 2,
    too_small: 3,
    not_compatible: 4,
  };

  analyses.sort((a, b) => {
    // First by status priority
    const statusDiff = statusPriority[a.analysis.status] - statusPriority[b.analysis.status];
    if (statusDiff !== 0) return statusDiff;

    // Then by quality rating
    const qualityPriority: Record<UploadQuality, number> = {
      excellent: 0,
      good: 1,
      fair: 2,
      poor: 3,
    };
    return qualityPriority[a.analysis.qualityRating] - qualityPriority[b.analysis.qualityRating];
  });

  return {
    suggested: analyses[0].typeId,
    analysis: analyses[0].analysis,
    alternatives: analyses.slice(1),
  };
}
