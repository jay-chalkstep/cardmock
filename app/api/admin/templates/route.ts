import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import sharp from 'sharp';
import { PREPAID_CARD_SPECS } from '@/lib/guidePresets';

export const dynamic = 'force-dynamic';

// Target dimensions for prepaid card templates at 300 DPI
const TARGET_WIDTH = PREPAID_CARD_SPECS.width;   // 1012
const TARGET_HEIGHT = PREPAID_CARD_SPECS.height; // 637
const TARGET_ASPECT_RATIO = TARGET_WIDTH / TARGET_HEIGHT; // ~1.589
const ASPECT_RATIO_TOLERANCE = 0.02; // 2% tolerance for aspect ratio

/**
 * Get quality warning based on scale factor
 */
function getQualityWarning(scaleFactor: number): {
  level: 'success' | 'warning' | 'caution' | 'danger';
  message: string;
} {
  if (scaleFactor <= 10) {
    return { level: 'success', message: 'Scaled to print resolution' };
  } else if (scaleFactor <= 30) {
    return { level: 'warning', message: 'May appear slightly soft in print' };
  } else if (scaleFactor <= 50) {
    return { level: 'caution', message: 'Noticeable quality loss likely' };
  } else {
    return { level: 'danger', message: 'Will appear blurry — consider a larger source' };
  }
}

/**
 * POST /api/admin/templates
 * Upload a new template (admin only)
 * Validates aspect ratio and scales to print resolution (1012×637 @ 300 DPI)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    // Check admin role
    const admin = await isAdmin();
    if (!admin) {
      return forbiddenResponse('Admin access required to upload templates');
    }

    logger.api('/api/admin/templates', 'POST', { orgId, userId });

    const supabase = createServerAdminClient();
    const formData = await request.formData();

    const imageFile = formData.get('image') as File;
    const templateName = formData.get('templateName') as string;

    if (!imageFile || !templateName) {
      return badRequestResponse('Missing required fields: image and templateName');
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return badRequestResponse('File must be an image');
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return badRequestResponse('File size must be less than 10MB');
    }

    // Convert File to ArrayBuffer for processing
    const arrayBuffer = await imageFile.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Get original image dimensions using sharp
    const metadata = await sharp(inputBuffer).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    if (!originalWidth || !originalHeight) {
      return badRequestResponse('Unable to read image dimensions');
    }

    // Check aspect ratio
    const uploadedAspectRatio = originalWidth / originalHeight;
    const aspectRatioDiff = Math.abs(uploadedAspectRatio - TARGET_ASPECT_RATIO) / TARGET_ASPECT_RATIO;

    if (aspectRatioDiff > ASPECT_RATIO_TOLERANCE) {
      return badRequestResponse(
        `Invalid aspect ratio. Expected ${TARGET_ASPECT_RATIO.toFixed(3)}:1 (prepaid card format), ` +
        `got ${uploadedAspectRatio.toFixed(3)}:1. ` +
        `Required dimensions: ${TARGET_WIDTH}×${TARGET_HEIGHT}px or proportionally scaled.`
      );
    }

    // Calculate scale factor (positive = upscaling, negative = downscaling)
    const scaleFactor = ((TARGET_WIDTH / originalWidth) - 1) * 100;

    // Scale image to target dimensions
    const scaledBuffer = await sharp(inputBuffer)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'fill', // Exact dimensions (aspect ratio already validated)
        kernel: scaleFactor > 0 ? 'lanczos3' : 'lanczos2', // Better quality for upscaling
      })
      .png({ quality: 100, compressionLevel: 6 }) // Always output as PNG for best quality
      .toBuffer();

    // Generate unique filename (always .png after processing)
    const fileName = `${Date.now()}-${templateName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;

    // Upload scaled image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('card-templates')
      .upload(fileName, scaledBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
      });

    if (uploadError) {
      logger.error('Template upload error', uploadError, { fileName });
      return handleSupabaseError(uploadError);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('card-templates')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Get quality warning
    const qualityWarning = getQualityWarning(Math.max(0, scaleFactor));

    // Create database record with dimension tracking
    const { data: template, error: dbError } = await supabase
      .from('templates')
      .insert({
        template_name: templateName,
        template_url: publicUrl,
        organization_id: orgId,
        created_by: userId,
        uploaded_date: new Date().toISOString(),
        file_type: 'image/png',
        file_size: scaledBuffer.length,
        // Dimension tracking
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        original_width: originalWidth,
        original_height: originalHeight,
        scale_factor: Math.round(scaleFactor * 100) / 100, // 2 decimal places
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file on DB error
      await supabase.storage.from('card-templates').remove([fileName]);
      return handleSupabaseError(dbError);
    }

    logger.info('Template uploaded successfully', {
      id: template.id,
      templateName,
      originalDimensions: `${originalWidth}×${originalHeight}`,
      scaleFactor: `${scaleFactor.toFixed(1)}%`,
    });

    // Return template with scaling info for UI feedback
    return successResponse({
      template,
      scalingInfo: {
        originalWidth,
        originalHeight,
        scaledWidth: TARGET_WIDTH,
        scaledHeight: TARGET_HEIGHT,
        scaleFactor: Math.round(scaleFactor * 100) / 100,
        qualityWarning,
      },
    }, 201);
  } catch (error) {
    logger.error('Template upload error', error);
    return errorResponse(error, 'Failed to upload template');
  }
}

/**
 * GET /api/admin/templates
 * List all templates for admin management
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    // Check admin role
    const admin = await isAdmin();
    if (!admin) {
      return forbiddenResponse('Admin access required');
    }

    const supabase = createServerAdminClient();

    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .eq('organization_id', orgId)
      .order('uploaded_date', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ templates: templates || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch templates');
  }
}

/**
 * DELETE /api/admin/templates
 * Delete a template (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    // Check admin role
    const admin = await isAdmin();
    if (!admin) {
      return forbiddenResponse('Admin access required to delete templates');
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return badRequestResponse('Template ID is required');
    }

    const supabase = createServerAdminClient();

    // Get template to find storage file
    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !template) {
      return badRequestResponse('Template not found');
    }

    // Extract filename from URL
    const fileName = template.template_url?.split('/').pop();

    // Delete from database
    const { error: deleteError } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      return handleSupabaseError(deleteError);
    }

    // Delete from storage (if file exists)
    if (fileName) {
      await supabase.storage.from('card-templates').remove([fileName]);
    }

    logger.info('Template deleted', { templateId });

    return successResponse({ message: 'Template deleted successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to delete template');
  }
}
