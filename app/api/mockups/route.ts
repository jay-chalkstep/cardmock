import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mockups
 * Save a new mockup/asset
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const supabase = createServerAdminClient();

    logger.api('/api/mockups', 'POST', { orgId, userId });

    const formData = await request.formData();
    const imageBlob = formData.get('image') as Blob;
    const mockupName = formData.get('mockupName') as string;
    const logoId = formData.get('logoId') as string;
    const templateId = formData.get('templateId') as string;
    const folderId = formData.get('folderId') as string | null;
    const projectId = formData.get('projectId') as string | null;
    const logoX = parseFloat(formData.get('logoX') as string);
    const logoY = parseFloat(formData.get('logoY') as string);
    const logoScale = parseFloat(formData.get('logoScale') as string);

    if (!mockupName || !logoId || !templateId || !imageBlob) {
      return badRequestResponse('Missing required fields: mockupName, logoId, templateId, or image');
    }

    // Upload image to storage
    const fileName = `${Date.now()}-${mockupName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('card-mockups')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600'
      });

    if (uploadError) {
      logger.error('Storage upload error', uploadError, { fileName, bucket: 'card-mockups' });
      return errorResponse(uploadError, 'Failed to upload image');
    }

    // Get public URL
    logger.debug('Getting public URL', { fileName, bucket: 'card-mockups' });

    const { data: urlData } = supabase.storage
      .from('card-mockups')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    logger.debug('Generated public URL', { url: publicUrl, length: publicUrl?.length });

    // Save to database
    const mockupData = {
      mockup_name: mockupName,
      logo_id: logoId,
      template_id: templateId,
      organization_id: orgId,
      created_by: userId,
      folder_id: folderId || null,
      project_id: projectId || null,
      logo_x: logoX,
      logo_y: logoY,
      logo_scale: logoScale,
      mockup_image_url: publicUrl
    };

    logger.db('Inserting mockup', { mockupName, orgId, userId });

    const { data: dbData, error: dbError } = await supabase
      .from('assets')
      .insert(mockupData)
      .select()
      .single();

    if (dbError) {
      return handleSupabaseError(dbError);
    }

    logger.info('Mockup saved successfully', { id: dbData.id, mockupName });

    return successResponse({ mockup: dbData }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to save mockup');
  }
}
