import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/templates
 * Upload a new template (admin only)
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

    // Generate unique filename
    const fileExt = imageFile.name.split('.').pop() || 'png';
    const fileName = `${Date.now()}-${templateName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${fileExt}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('card-templates')
      .upload(fileName, buffer, {
        contentType: imageFile.type,
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

    // Create database record
    const { data: template, error: dbError } = await supabase
      .from('templates')
      .insert({
        template_name: templateName,
        template_url: publicUrl,
        organization_id: orgId,
        created_by: userId,
        uploaded_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file on DB error
      await supabase.storage.from('card-templates').remove([fileName]);
      return handleSupabaseError(dbError);
    }

    logger.info('Template uploaded successfully', { id: template.id, templateName });

    return successResponse({ template }, 201);
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
