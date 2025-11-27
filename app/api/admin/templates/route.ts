import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import sharp from 'sharp';
import {
  TemplateTypeId,
  TEMPLATE_TYPES,
  getTemplateType,
  analyzeUpload,
  calculateQualityRating,
  UploadAnalysis,
} from '@/lib/templateTypes';

export const dynamic = 'force-dynamic';

/**
 * Get quality warning message based on scale factor percentage
 */
function getQualityWarning(scaleFactorPercent: number): {
  level: 'success' | 'warning' | 'caution' | 'danger';
  message: string;
} {
  if (scaleFactorPercent <= 10) {
    return { level: 'success', message: 'Scaled to target resolution' };
  } else if (scaleFactorPercent <= 30) {
    return { level: 'warning', message: 'May appear slightly soft' };
  } else if (scaleFactorPercent <= 50) {
    return { level: 'caution', message: 'Noticeable quality loss likely' };
  } else {
    return { level: 'danger', message: 'Will appear blurry — consider a larger source' };
  }
}

/**
 * POST /api/admin/templates
 * Upload a new template (admin only)
 * Supports multiple template types with type-aware normalization
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
    const templateTypeId = (formData.get('templateTypeId') as TemplateTypeId) || 'prepaid-cr80';
    const tagsRaw = formData.get('tags') as string;
    const description = formData.get('description') as string;
    const skipNormalization = formData.get('skipNormalization') === 'true';

    if (!imageFile || !templateName) {
      return badRequestResponse('Missing required fields: image and templateName');
    }

    // Validate template type
    if (!TEMPLATE_TYPES[templateTypeId]) {
      return badRequestResponse(`Invalid template type: ${templateTypeId}`);
    }

    const templateType = getTemplateType(templateTypeId);

    // Parse tags (JSON array or comma-separated string)
    let tags: string[] = [];
    if (tagsRaw) {
      try {
        tags = JSON.parse(tagsRaw);
      } catch {
        // Try comma-separated
        tags = tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      }
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

    // Analyze the upload against the selected template type
    const analysis = analyzeUpload(originalWidth, originalHeight, templateTypeId);

    // If not compatible and not forcing, reject
    if (analysis.status === 'not_compatible' && !skipNormalization) {
      return badRequestResponse(
        `Image is not compatible with ${templateType.name}. ` +
        `Expected aspect ratio: ~${templateType.aspectRatio.toFixed(2)}:1, ` +
        `got ${analysis.originalRatio.toFixed(2)}:1. ` +
        `Upload a different image or use skipNormalization=true to force.`
      );
    }

    // Process image: crop if needed, then resize
    let processedBuffer: Buffer;
    let scaleFactor = analysis.scaleFactor;

    if (analysis.status === 'exact') {
      // Already perfect, just convert to PNG
      processedBuffer = await sharp(inputBuffer)
        .png({ quality: 100, compressionLevel: 6 })
        .toBuffer();
    } else if (analysis.cropNeeded) {
      // Crop then resize
      const { x, y, width, height } = analysis.cropNeeded;
      processedBuffer = await sharp(inputBuffer)
        .extract({ left: x, top: y, width, height })
        .resize(templateType.width, templateType.height, {
          fit: 'fill',
          kernel: scaleFactor > 1 ? 'lanczos3' : 'lanczos2',
        })
        .png({ quality: 100, compressionLevel: 6 })
        .toBuffer();
    } else {
      // Just resize
      processedBuffer = await sharp(inputBuffer)
        .resize(templateType.width, templateType.height, {
          fit: 'fill',
          kernel: scaleFactor > 1 ? 'lanczos3' : 'lanczos2',
        })
        .png({ quality: 100, compressionLevel: 6 })
        .toBuffer();
    }

    // Calculate scale factor percentage for tracking
    const scaleFactorPercent = ((scaleFactor - 1) * 100);

    // Determine storage path based on template type category
    const storagePath = templateType.category === 'digital'
      ? `wallet/${templateTypeId}`
      : 'card-templates';

    // Generate unique filename
    const fileName = `${Date.now()}-${templateName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
    const fullPath = templateType.category === 'digital'
      ? `${templateTypeId}/${fileName}`
      : fileName;

    // Upload processed image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('card-templates')
      .upload(fullPath, processedBuffer, {
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
      .getPublicUrl(fullPath);

    const publicUrl = urlData.publicUrl;

    // Get quality warning for UI feedback
    const qualityWarning = getQualityWarning(Math.max(0, scaleFactorPercent));

    // Create database record with all new fields
    const { data: template, error: dbError } = await supabase
      .from('templates')
      .insert({
        template_name: templateName,
        template_url: publicUrl,
        organization_id: orgId,
        created_by: userId,
        uploaded_date: new Date().toISOString(),
        file_type: 'image/png',
        file_size: processedBuffer.length,
        // Dimension tracking
        width: templateType.width,
        height: templateType.height,
        original_width: originalWidth,
        original_height: originalHeight,
        scale_factor: Math.round(scaleFactorPercent * 100) / 100,
        // New fields
        template_type_id: templateTypeId,
        tags: tags,
        upload_quality: analysis.qualityRating,
        description: description || null,
        is_archived: false,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file on DB error
      await supabase.storage.from('card-templates').remove([fullPath]);
      return handleSupabaseError(dbError);
    }

    logger.info('Template uploaded successfully', {
      id: template.id,
      templateName,
      templateType: templateTypeId,
      originalDimensions: `${originalWidth}×${originalHeight}`,
      targetDimensions: `${templateType.width}×${templateType.height}`,
      scaleFactor: `${scaleFactorPercent.toFixed(1)}%`,
      quality: analysis.qualityRating,
      tags: tags.length,
    });

    // Return template with analysis info for UI feedback
    return successResponse({
      template,
      analysis,
      scalingInfo: {
        originalWidth,
        originalHeight,
        scaledWidth: templateType.width,
        scaledHeight: templateType.height,
        scaleFactor: Math.round(scaleFactorPercent * 100) / 100,
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
 * List all templates for admin management with filtering
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

    const { searchParams } = new URL(request.url);
    const templateTypeId = searchParams.get('type') as TemplateTypeId | null;
    const showArchived = searchParams.get('archived') === 'true';
    const tagsParam = searchParams.get('tags');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = createServerAdminClient();

    let query = supabase
      .from('templates')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId);

    // Filter by template type
    if (templateTypeId && TEMPLATE_TYPES[templateTypeId]) {
      query = query.eq('template_type_id', templateTypeId);
    }

    // Filter archived
    if (!showArchived) {
      query = query.eq('is_archived', false);
    }

    // Filter by tags (if provided)
    if (tagsParam) {
      const tags = tagsParam.split(',').map(t => t.trim().toLowerCase());
      query = query.contains('tags', tags);
    }

    // Search by name
    if (search) {
      query = query.ilike('template_name', `%${search}%`);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query
      .order('uploaded_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: templates, error, count } = await query;

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({
      templates: templates || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch templates');
  }
}

/**
 * PATCH /api/admin/templates
 * Update template metadata (name, tags, description, archive status)
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    // Check admin role
    const admin = await isAdmin();
    if (!admin) {
      return forbiddenResponse('Admin access required to update templates');
    }

    const body = await request.json();
    const { id, template_name, tags, description, is_archived } = body;

    if (!id) {
      return badRequestResponse('Template ID is required');
    }

    const supabase = createServerAdminClient();

    // Verify template exists and belongs to org
    const { data: existing, error: fetchError } = await supabase
      .from('templates')
      .select('id, is_archived')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !existing) {
      return badRequestResponse('Template not found');
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (template_name !== undefined) {
      updates.template_name = template_name;
    }

    if (tags !== undefined) {
      // Normalize tags to lowercase
      updates.tags = Array.isArray(tags)
        ? tags.map(t => t.toString().toLowerCase().trim()).filter(Boolean)
        : [];
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (is_archived !== undefined) {
      updates.is_archived = is_archived;
      if (is_archived && !existing.is_archived) {
        // Archiving
        updates.archived_at = new Date().toISOString();
        updates.archived_by = userId;
      } else if (!is_archived && existing.is_archived) {
        // Restoring
        updates.archived_at = null;
        updates.archived_by = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return badRequestResponse('No updates provided');
    }

    const { data: template, error: updateError } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Template updated', { id, updates: Object.keys(updates) });

    return successResponse({ template });
  } catch (error) {
    return errorResponse(error, 'Failed to update template');
  }
}

/**
 * DELETE /api/admin/templates
 * Delete a template (admin only)
 * Will warn if template is in use by existing assets
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
    const force = searchParams.get('force') === 'true';

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

    // Check if template is in use
    const { count: usageCount } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', templateId);

    if (usageCount && usageCount > 0 && !force) {
      return errorResponse(
        null,
        `Template is used in ${usageCount} asset(s). Use force=true to delete anyway.`,
        400
      );
    }

    // Extract filename from URL for storage deletion
    const urlParts = template.template_url?.split('/');
    const bucket = 'card-templates';
    // Handle both direct filenames and subdirectory paths
    let storagePath = urlParts?.slice(-1)[0];
    if (template.template_type_id && template.template_type_id !== 'prepaid-cr80') {
      storagePath = `${template.template_type_id}/${storagePath}`;
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      return handleSupabaseError(deleteError);
    }

    // Delete from storage (if file exists)
    if (storagePath) {
      await supabase.storage.from(bucket).remove([storagePath]);
    }

    logger.info('Template deleted', {
      templateId,
      usageCount: usageCount || 0,
      forced: force,
    });

    return successResponse({
      message: 'Template deleted successfully',
      usageCount: usageCount || 0,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to delete template');
  }
}
