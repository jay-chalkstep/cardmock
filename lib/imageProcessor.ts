/**
 * Client-side Image Processing Utilities
 *
 * Uses the Canvas API for high-quality image manipulation
 * including cropping and resizing for template normalization.
 */

import { CR80_SPECS } from './templateNormalization';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Load an image from a File object
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Load an image from a data URL
 */
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image from data URL'));

    img.src = dataUrl;
  });
}

/**
 * Create an offscreen canvas with proper settings for high-quality rendering
 */
function createHighQualityCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', {
    alpha: true,
    willReadFrequently: false,
  });

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Enable high-quality image smoothing (bicubic-like quality)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  return { canvas, ctx };
}

/**
 * Crop an image to the specified rectangle
 */
export async function cropImage(
  image: HTMLImageElement,
  cropRect: CropRect
): Promise<ProcessedImage> {
  const { canvas, ctx } = createHighQualityCanvas(cropRect.width, cropRect.height);

  // Draw the cropped region
  ctx.drawImage(
    image,
    cropRect.x, cropRect.y, cropRect.width, cropRect.height, // Source
    0, 0, cropRect.width, cropRect.height // Destination
  );

  return canvasToProcessedImage(canvas);
}

/**
 * Resize an image to the specified dimensions using high-quality interpolation
 * Uses a multi-step downscaling approach for better quality when shrinking
 */
export async function resizeImage(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): Promise<ProcessedImage> {
  // For significant downscaling, use step-down approach for better quality
  const scaleX = targetWidth / image.width;
  const scaleY = targetHeight / image.height;
  const scale = Math.min(scaleX, scaleY);

  if (scale < 0.5) {
    // Multi-step downscale for better quality
    return stepDownResize(image, targetWidth, targetHeight);
  }

  // Direct resize for small scale changes or upscaling
  const { canvas, ctx } = createHighQualityCanvas(targetWidth, targetHeight);
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  return canvasToProcessedImage(canvas);
}

/**
 * Step-down resize for better quality when significantly shrinking images
 * Reduces size by half in each step until close to target, then final resize
 */
async function stepDownResize(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): Promise<ProcessedImage> {
  let currentSource: HTMLImageElement | HTMLCanvasElement = image;
  let currentWidth = image.width;
  let currentHeight = image.height;

  // Step down by half until within 2x of target
  while (currentWidth > targetWidth * 2 && currentHeight > targetHeight * 2) {
    const nextWidth = Math.round(currentWidth / 2);
    const nextHeight = Math.round(currentHeight / 2);

    const { canvas, ctx } = createHighQualityCanvas(nextWidth, nextHeight);
    ctx.drawImage(currentSource, 0, 0, nextWidth, nextHeight);

    currentSource = canvas;
    currentWidth = nextWidth;
    currentHeight = nextHeight;
  }

  // Final resize to exact target dimensions
  const { canvas, ctx } = createHighQualityCanvas(targetWidth, targetHeight);
  ctx.drawImage(currentSource, 0, 0, targetWidth, targetHeight);

  return canvasToProcessedImage(canvas);
}

/**
 * Crop and resize an image in one operation
 */
export async function cropAndResize(
  image: HTMLImageElement,
  cropRect: CropRect,
  targetWidth: number,
  targetHeight: number
): Promise<ProcessedImage> {
  // First crop to get the right aspect ratio
  const { canvas: cropCanvas, ctx: cropCtx } = createHighQualityCanvas(
    cropRect.width,
    cropRect.height
  );

  cropCtx.drawImage(
    image,
    cropRect.x, cropRect.y, cropRect.width, cropRect.height,
    0, 0, cropRect.width, cropRect.height
  );

  // Then resize the cropped result
  const cropImg = await canvasToImage(cropCanvas);
  return resizeImage(cropImg, targetWidth, targetHeight);
}

/**
 * Normalize a template image to CR80 300 DPI specs
 * Handles both crop (if needed) and resize operations
 */
export async function normalizeTemplate(
  file: File,
  cropRect?: CropRect
): Promise<ProcessedImage> {
  const image = await loadImage(file);
  const targetWidth = CR80_SPECS.DPI_300.width;
  const targetHeight = CR80_SPECS.DPI_300.height;

  if (cropRect) {
    return cropAndResize(image, cropRect, targetWidth, targetHeight);
  }

  return resizeImage(image, targetWidth, targetHeight);
}

/**
 * Convert a canvas to a ProcessedImage object
 */
async function canvasToProcessedImage(canvas: HTMLCanvasElement): Promise<ProcessedImage> {
  const dataUrl = canvas.toDataURL('image/png', 1.0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/png',
      1.0
    );
  });

  return {
    blob,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Convert a canvas to an image element
 */
function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to convert canvas to image'));
    img.src = canvas.toDataURL('image/png');
  });
}

/**
 * Create a File object from a ProcessedImage
 */
export function processedImageToFile(
  processed: ProcessedImage,
  originalFileName: string
): File {
  // Generate new filename with normalized suffix
  const baseName = originalFileName.replace(/\.[^.]+$/, '');
  const newFileName = `${baseName}-normalized.png`;

  return new File([processed.blob], newFileName, {
    type: 'image/png',
    lastModified: Date.now(),
  });
}

/**
 * Generate a preview of the crop area
 * Returns a data URL showing the image with crop overlay
 */
export async function generateCropPreview(
  image: HTMLImageElement,
  cropRect: CropRect,
  previewWidth: number = 600
): Promise<string> {
  // Calculate preview dimensions maintaining aspect ratio
  const scale = previewWidth / image.width;
  const previewHeight = Math.round(image.height * scale);

  const { canvas, ctx } = createHighQualityCanvas(previewWidth, previewHeight);

  // Draw the full image
  ctx.drawImage(image, 0, 0, previewWidth, previewHeight);

  // Draw darkened overlay on areas to be cropped
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

  // Scale crop rect to preview size
  const scaledCrop = {
    x: Math.round(cropRect.x * scale),
    y: Math.round(cropRect.y * scale),
    width: Math.round(cropRect.width * scale),
    height: Math.round(cropRect.height * scale),
  };

  // Draw dark overlay on cropped areas
  // Top strip
  if (scaledCrop.y > 0) {
    ctx.fillRect(0, 0, previewWidth, scaledCrop.y);
  }
  // Bottom strip
  if (scaledCrop.y + scaledCrop.height < previewHeight) {
    ctx.fillRect(0, scaledCrop.y + scaledCrop.height, previewWidth, previewHeight - scaledCrop.y - scaledCrop.height);
  }
  // Left strip
  if (scaledCrop.x > 0) {
    ctx.fillRect(0, scaledCrop.y, scaledCrop.x, scaledCrop.height);
  }
  // Right strip
  if (scaledCrop.x + scaledCrop.width < previewWidth) {
    ctx.fillRect(scaledCrop.x + scaledCrop.width, scaledCrop.y, previewWidth - scaledCrop.x - scaledCrop.width, scaledCrop.height);
  }

  // Draw border around kept area
  ctx.strokeStyle = '#22c55e'; // Green
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height);

  return canvas.toDataURL('image/png');
}

/**
 * Adjust crop rectangle while maintaining aspect ratio
 * Used when user drags the crop area
 */
export function adjustCropPosition(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number,
  newX: number,
  newY: number
): CropRect {
  // Clamp the position to keep crop within image bounds
  const maxX = imageWidth - cropWidth;
  const maxY = imageHeight - cropHeight;

  return {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY)),
    width: cropWidth,
    height: cropHeight,
  };
}
