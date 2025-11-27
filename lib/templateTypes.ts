/**
 * Template Types System
 *
 * Defines supported template formats (CR80, Apple Wallet, Google Wallet)
 * and provides analysis utilities for upload normalization.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Template type identifier
 */
export type TemplateTypeId = 'prepaid-cr80' | 'wallet-apple' | 'wallet-google';

/**
 * Template category
 */
export type TemplateCategory = 'physical' | 'digital';

/**
 * Upload quality rating based on scale factor
 */
export type UploadQuality = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Template type definition (matches database schema)
 */
export interface TemplateType {
  id: TemplateTypeId;
  name: string;
  width: number;
  height: number;
  aspectRatio: number;
  category: TemplateCategory;
  description: string;
  guidePresets: Record<string, number>;
}

/**
 * Upload analysis status codes
 */
export type UploadStatus =
  | 'exact'           // Matches target dimensions exactly
  | 'correct_ratio'   // Right aspect ratio, just needs resize
  | 'wrong_ratio'     // Needs crop + resize
  | 'too_small'       // Smaller than target, warn about quality
  | 'not_compatible'; // Aspect ratio wildly off

/**
 * Crop rectangle definition
 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Result of analyzing an uploaded image against a template type
 */
export interface UploadAnalysis {
  status: UploadStatus;
  originalWidth: number;
  originalHeight: number;
  originalRatio: number;
  targetWidth: number;
  targetHeight: number;
  targetRatio: number;
  ratioDelta: number;         // How far off the aspect ratio is (percentage)
  scaleFactor: number;        // How much upscaling needed (1.0 = none, 1.5 = 50% upscale)
  cropNeeded: CropRect | null;
  qualityRating: UploadQuality;
  message: string;
  templateType: TemplateType;
}

/**
 * Extended template interface (matches database schema with new columns)
 */
export interface Template {
  id: string;
  template_name: string;
  template_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_date: string;
  organization_id: string | null;
  created_by: string | null;
  width: number;
  height: number;
  original_width: number | null;
  original_height: number | null;
  scale_factor: number | null;
  // New columns
  template_type_id: TemplateTypeId;
  tags: string[];
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  upload_quality: UploadQuality | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TEMPLATE TYPE SPECIFICATIONS
// ============================================================================

/**
 * All supported template types with their specifications
 */
export const TEMPLATE_TYPES: Record<TemplateTypeId, TemplateType> = {
  'prepaid-cr80': {
    id: 'prepaid-cr80',
    name: 'Prepaid Card (CR80)',
    width: 1013,
    height: 638,
    aspectRatio: 1.5878,
    category: 'physical',
    description: 'Standard credit card size for prepaid, gift, and payment cards. Print-ready at 300 DPI.',
    guidePresets: {
      logo_left: 90,
      logo_top: 107,
      midpoint: 384,
    },
  },
  'wallet-apple': {
    id: 'wallet-apple',
    name: 'Apple Wallet',
    width: 1032,
    height: 336,
    aspectRatio: 3.0714,
    category: 'digital',
    description: 'Hero/strip image for Apple Wallet passes. Used for loyalty cards, gift cards, and coupons.',
    guidePresets: {
      logo_zone_right: 200,
      safe_area: 50,
    },
  },
  'wallet-google': {
    id: 'wallet-google',
    name: 'Google Wallet',
    width: 1032,
    height: 336,
    aspectRatio: 3.0714,
    category: 'digital',
    description: 'Hero image for Google Wallet passes. Same dimensions as Apple Wallet for cross-platform compatibility.',
    guidePresets: {
      logo_zone_right: 200,
      safe_area: 50,
    },
  },
};

/**
 * Get template type by ID
 */
export function getTemplateType(id: TemplateTypeId): TemplateType {
  const type = TEMPLATE_TYPES[id];
  if (!type) {
    throw new Error(`Unknown template type: ${id}`);
  }
  return type;
}

/**
 * Get all template types as an array
 */
export function getAllTemplateTypes(): TemplateType[] {
  return Object.values(TEMPLATE_TYPES);
}

/**
 * Get template types by category
 */
export function getTemplateTypesByCategory(category: TemplateCategory): TemplateType[] {
  return Object.values(TEMPLATE_TYPES).filter(t => t.category === category);
}

// ============================================================================
// UPLOAD ANALYSIS
// ============================================================================

/**
 * Tolerance for aspect ratio matching (0.5%)
 */
const RATIO_TOLERANCE = 0.005;

/**
 * Maximum ratio deviation before considering not compatible (10%)
 */
const MAX_RATIO_DEVIATION = 0.1;

/**
 * Calculate quality rating based on scale factor
 */
export function calculateQualityRating(scaleFactor: number): UploadQuality {
  if (scaleFactor <= 1.0) return 'excellent';      // Downscaling or exact
  if (scaleFactor <= 1.1) return 'good';           // Up to 10% upscale
  if (scaleFactor <= 1.3) return 'fair';           // 10-30% upscale
  return 'poor';                                    // 30%+ upscale
}

/**
 * Calculate the crop rectangle needed to achieve target aspect ratio
 */
export function calculateCropRect(
  originalWidth: number,
  originalHeight: number,
  targetRatio: number
): CropRect {
  const originalRatio = originalWidth / originalHeight;

  if (originalRatio > targetRatio) {
    // Too wide - crop sides
    const cropHeight = originalHeight;
    const cropWidth = Math.round(originalHeight * targetRatio);
    const cropX = Math.round((originalWidth - cropWidth) / 2);
    return { x: cropX, y: 0, width: cropWidth, height: cropHeight };
  } else {
    // Too tall - crop top/bottom
    const cropWidth = originalWidth;
    const cropHeight = Math.round(originalWidth / targetRatio);
    const cropY = Math.round((originalHeight - cropHeight) / 2);
    return { x: 0, y: cropY, width: cropWidth, height: cropHeight };
  }
}

/**
 * Analyze an uploaded image against a template type
 *
 * @param originalWidth - Width of the uploaded image in pixels
 * @param originalHeight - Height of the uploaded image in pixels
 * @param templateTypeId - The target template type ID
 * @returns Analysis result with status, quality rating, and normalization info
 */
export function analyzeUpload(
  originalWidth: number,
  originalHeight: number,
  templateTypeId: TemplateTypeId
): UploadAnalysis {
  const templateType = getTemplateType(templateTypeId);
  const originalRatio = originalWidth / originalHeight;
  const ratioDelta = Math.abs(originalRatio - templateType.aspectRatio) / templateType.aspectRatio;

  const baseResult = {
    originalWidth,
    originalHeight,
    originalRatio,
    targetWidth: templateType.width,
    targetHeight: templateType.height,
    targetRatio: templateType.aspectRatio,
    ratioDelta,
    templateType,
  };

  // Check if dimensions match exactly
  if (originalWidth === templateType.width && originalHeight === templateType.height) {
    return {
      ...baseResult,
      status: 'exact',
      scaleFactor: 1.0,
      cropNeeded: null,
      qualityRating: 'excellent',
      message: 'Perfect! Image matches template specifications exactly.',
    };
  }

  // Check aspect ratio
  const ratioMatches = ratioDelta <= RATIO_TOLERANCE;
  const isOversized = originalWidth >= templateType.width && originalHeight >= templateType.height;

  // Calculate scale factor based on whether cropping is needed
  let scaleFactor: number;
  let cropNeeded: CropRect | null = null;

  if (ratioMatches) {
    // No crop needed, just resize
    scaleFactor = templateType.width / originalWidth;
  } else if (ratioDelta <= MAX_RATIO_DEVIATION) {
    // Crop needed
    cropNeeded = calculateCropRect(originalWidth, originalHeight, templateType.aspectRatio);
    scaleFactor = templateType.width / cropNeeded.width;
  } else {
    // Not compatible - ratio too different
    scaleFactor = templateType.width / originalWidth; // For reference only
  }

  const qualityRating = calculateQualityRating(scaleFactor);

  // Ratio doesn't match and deviation is too large
  if (ratioDelta > MAX_RATIO_DEVIATION) {
    return {
      ...baseResult,
      status: 'not_compatible',
      scaleFactor,
      cropNeeded: null,
      qualityRating: 'poor',
      message: `This image's proportions don't match ${templateType.name}. Expected ~${templateType.aspectRatio.toFixed(2)}:1 ratio, got ${originalRatio.toFixed(2)}:1.`,
    };
  }

  // Check if too small (needs upscaling)
  if (scaleFactor > 1.0) {
    const upscalePercent = Math.round((scaleFactor - 1) * 100);
    return {
      ...baseResult,
      status: 'too_small',
      scaleFactor,
      cropNeeded,
      qualityRating,
      message: cropNeeded
        ? `Image is smaller than recommended and needs cropping. ${upscalePercent}% upscaling will be applied.`
        : `Image is smaller than recommended. ${upscalePercent}% upscaling may reduce quality.`,
    };
  }

  // Check if ratio needs adjustment
  if (!ratioMatches && cropNeeded) {
    const cropDirection = cropNeeded.y === 0 ? 'sides' : 'top/bottom';
    const cropAmount = cropNeeded.y === 0
      ? originalWidth - cropNeeded.width
      : originalHeight - cropNeeded.height;

    return {
      ...baseResult,
      status: 'wrong_ratio',
      scaleFactor,
      cropNeeded,
      qualityRating,
      message: `Image will be cropped (${cropAmount}px from ${cropDirection}) and scaled to fit ${templateType.name} dimensions.`,
    };
  }

  // Correct ratio, needs resize only (oversized)
  return {
    ...baseResult,
    status: 'correct_ratio',
    scaleFactor,
    cropNeeded: null,
    qualityRating,
    message: `Image will be scaled to ${templateType.width}×${templateType.height}px.`,
  };
}

// ============================================================================
// USER FEEDBACK MESSAGES
// ============================================================================

/**
 * Get detailed user prompt based on upload analysis
 */
export function getUploadPrompt(analysis: UploadAnalysis): {
  title: string;
  description: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  showPreview: boolean;
  showCropAdjust: boolean;
} {
  const { status, originalWidth, originalHeight, templateType, qualityRating, cropNeeded } = analysis;

  switch (status) {
    case 'exact':
      return {
        title: 'Perfect Match',
        description: `Your image matches the ${templateType.name} specifications exactly.`,
        variant: 'success',
        showPreview: false,
        showCropAdjust: false,
      };

    case 'correct_ratio':
      return {
        title: 'Ready to Scale',
        description: `Your image is ${originalWidth}×${originalHeight}px. It will be scaled to ${templateType.width}×${templateType.height}px for ${templateType.name}.`,
        variant: 'info',
        showPreview: true,
        showCropAdjust: false,
      };

    case 'too_small':
      return {
        title: 'Small Image Warning',
        description: `Your image is ${originalWidth}×${originalHeight}px, smaller than the ${templateType.width}×${templateType.height}px standard. Upscaling may reduce quality. Quality rating: ${qualityRating}.`,
        variant: 'warning',
        showPreview: true,
        showCropAdjust: cropNeeded !== null,
      };

    case 'wrong_ratio':
      const cropDirection = cropNeeded?.y === 0 ? 'sides' : 'top/bottom';
      const cropAmount = cropNeeded
        ? (cropNeeded.y === 0 ? originalWidth - cropNeeded.width : originalHeight - cropNeeded.height)
        : 0;

      return {
        title: 'Crop Required',
        description: `Your image is ${originalWidth}×${originalHeight}px (${analysis.originalRatio.toFixed(2)}:1). ${templateType.name} requires ${templateType.aspectRatio.toFixed(2)}:1. ${cropAmount}px will be cropped from the ${cropDirection}.`,
        variant: 'warning',
        showPreview: true,
        showCropAdjust: true,
      };

    case 'not_compatible':
      return {
        title: 'Not Compatible',
        description: `This image doesn't appear to be compatible with ${templateType.name}. Expected aspect ratio: ~${templateType.aspectRatio.toFixed(2)}:1. Your image: ${analysis.originalRatio.toFixed(2)}:1.`,
        variant: 'error',
        showPreview: false,
        showCropAdjust: false,
      };

    default:
      return {
        title: 'Unknown Status',
        description: 'Unable to analyze image.',
        variant: 'error',
        showPreview: false,
        showCropAdjust: false,
      };
  }
}

// ============================================================================
// SUGGESTED TAGS
// ============================================================================

/**
 * Suggested tag categories for templates
 */
export const SUGGESTED_TAGS = {
  network: ['visa', 'mastercard', 'amex', 'discover'],
  cardType: ['debit', 'credit', 'prepaid', 'gift', 'reward', 'payroll'],
  useCase: ['disbursement', 'incentive', 'loyalty', 'employee'],
  style: ['minimal', 'gradient', 'photo', 'branded', 'dark', 'light'],
  status: ['draft', 'approved', 'deprecated'],
} as const;

/**
 * Get all suggested tags as a flat array
 */
export function getAllSuggestedTags(): string[] {
  return Object.values(SUGGESTED_TAGS).flat();
}
