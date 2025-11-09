import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { CARD_TEMPLATES_BUCKET } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    logger.api('/api/card-upload', 'POST', { orgId, userId });

    const supabase = createServerAdminClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const templateName = formData.get('templateName') as string;

    logger.debug('Parsing form data', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      templateName,
    });

    if (!file || !templateName) {
      return badRequestResponse('File and template name are required');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${templateName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${fileExtension}`;

    logger.debug('Generated filename', { fileName });

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.debug('File converted to buffer', { size: buffer.length });

    // Upload to Supabase Storage
    logger.db('Uploading to storage', { bucket: CARD_TEMPLATES_BUCKET, fileName });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CARD_TEMPLATES_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      logger.error('Storage upload failed', uploadError, { fileName, bucket: CARD_TEMPLATES_BUCKET });
      return errorResponse(uploadError, 'Failed to upload file to storage');
    }

    logger.debug('Storage upload successful', { fileName });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(CARD_TEMPLATES_BUCKET)
      .getPublicUrl(fileName);

    logger.debug('Public URL generated', { url: urlData.publicUrl });

    // Save metadata to database
    const insertData = {
      template_name: templateName,
      template_url: urlData.publicUrl,
      organization_id: orgId,
      created_by: userId,
      file_type: file.type,
      file_size: file.size,
    };

    logger.db('Inserting template metadata', { templateName, orgId });

    const { data: dbData, error: dbError } = await supabase
      .from('templates')
      .insert(insertData)
      .select()
      .single();

    if (dbError) {
      logger.error('Database insert failed', dbError, { templateName, orgId });

      // Try to clean up uploaded file
      logger.debug('Cleaning up uploaded file', { fileName });
      const { error: deleteError } = await supabase.storage
        .from(CARD_TEMPLATES_BUCKET)
        .remove([fileName]);

      if (deleteError) {
        logger.error('Failed to delete file during cleanup', deleteError);
      }

      return handleSupabaseError(dbError);
    }

    logger.info('Template uploaded successfully', { templateId: dbData.id, templateName });

    return successResponse({
      template: dbData,
    }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to upload template');
  }
}