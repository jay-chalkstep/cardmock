import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/mockups/[id]
 *
 * Get a single mockup with related data
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/mockups/${id}`, 'GET', { orgId });

    // Fetch mockup with logo and template data
    const { data: mockup, error: mockupError } = await supabaseServer
      .from('assets')
      .select(`
        *,
        logo:logo_variants!logo_id (
          id,
          logo_url
        ),
        template:templates!template_id (
          id,
          template_name,
          template_url
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    return successResponse({ mockup });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch mockup');
  }
}

/**
 * PATCH /api/mockups/[id]
 *
 * Update a mockup (for moving to a folder or assigning to a project)
 *
 * Body:
 * {
 *   folder_id?: string | null (move to folder, null for unsorted),
 *   project_id?: string | null (assign to project, null to unassign)
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;

    const body = await request.json();
    const { folder_id, project_id } = body;

    // Get the mockup to check ownership
    const { data: mockup, error: fetchError } = await supabaseServer
      .from('assets')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    logger.api(`/api/mockups/${id}`, 'PATCH', { orgId, userId });

    if (fetchError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    // Check if user owns this mockup (or if it's legacy data without created_by)
    if (mockup.created_by && mockup.created_by !== userId) {
      return forbiddenResponse('You do not have permission to modify this mockup');
    }

    logger.api(`/api/mockups/${id}`, 'PATCH', { orgId, userId, folder_id, project_id });

    // If moving to a folder, verify the folder exists and user can access it
    if (folder_id) {
      const { data: folder, error: folderError } = await supabaseServer
        .from('folders')
        .select('*')
        .eq('id', folder_id)
        .eq('organization_id', orgId)
        .single();

      if (folderError || !folder) {
        return notFoundResponse('Target folder not found');
      }

      // Check if user can access this folder (own folder or org-shared)
      if (folder.created_by !== userId && !folder.is_org_shared) {
        return forbiddenResponse('You do not have access to this folder');
      }
    }

    // If assigning to a project, verify the project exists and belongs to organization
    if (project_id) {
      const { data: project, error: projectError } = await supabaseServer
        .from('projects')
        .select('id')
        .eq('id', project_id)
        .eq('organization_id', orgId)
        .single();

      if (projectError || !project) {
        return notFoundResponse('Target project not found');
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (folder_id !== undefined) {
      updateData.folder_id = folder_id || null;
    }
    if (project_id !== undefined) {
      updateData.project_id = project_id || null;
    }

    // Update mockup
    const { data: updatedMockup, error: updateError } = await supabaseServer
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Mockup updated successfully', { mockupId: id });

    return successResponse({ mockup: updatedMockup });
  } catch (error) {
    return errorResponse(error, 'Failed to update mockup');
  }
}

/**
 * PUT /api/mockups/[id]
 *
 * Update an existing mockup (for editing in designer)
 *
 * Accepts FormData with:
 * - image: Blob (new mockup image)
 * - mockupName: string
 * - logoId: string
 * - templateId: string
 * - folderId?: string
 * - logoX: number (percentage)
 * - logoY: number (percentage)
 * - logoScale: number (percentage)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const { id } = await context.params;

    logger.api(`/api/mockups/${id}`, 'PUT', { orgId, userId });

    // Get the mockup to check ownership
    const { data: existingMockup, error: fetchError } = await supabaseServer
      .from('assets')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !existingMockup) {
      return notFoundResponse('Mockup not found');
    }

    // Check if user owns this mockup (or if it's legacy data without created_by)
    if (existingMockup.created_by && existingMockup.created_by !== userId) {
      return forbiddenResponse('You do not have permission to modify this mockup');
    }

    // Parse form data
    const formData = await request.formData();
    const imageBlob = formData.get('image') as Blob;
    const mockupName = formData.get('mockupName') as string;
    const logoId = formData.get('logoId') as string;
    const templateId = formData.get('templateId') as string;
    const folderId = formData.get('folderId') as string | null;
    const logoX = parseFloat(formData.get('logoX') as string);
    const logoY = parseFloat(formData.get('logoY') as string);
    const logoScale = parseFloat(formData.get('logoScale') as string);

    if (!mockupName || !logoId || !templateId || !imageBlob) {
      return errorResponse(new Error('Missing required fields'), 'Missing required fields: mockupName, logoId, templateId, or image');
    }

    // Delete old image from storage if it exists
    if (existingMockup.mockup_image_url) {
      const url = existingMockup.mockup_image_url;
      const match = url.match(/\/card-mockups\/([^?]+)/);

      if (match && match[1]) {
        const { error: deleteError } = await supabaseServer.storage
          .from('card-mockups')
          .remove([match[1]]);

        if (deleteError) {
          logger.warn('Error deleting old storage file, continuing with update', { error: deleteError });
        }
      }
    }

    // Upload new image to storage
    const fileName = `${Date.now()}-${mockupName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;

    const { data: uploadData, error: uploadError } = await supabaseServer.storage
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
    const { data: urlData } = supabaseServer.storage
      .from('card-mockups')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update database record
    const updateData = {
      mockup_name: mockupName,
      logo_id: logoId,
      template_id: templateId,
      folder_id: folderId || null,
      logo_x: logoX,
      logo_y: logoY,
      logo_scale: logoScale,
      mockup_image_url: publicUrl,
      updated_at: new Date().toISOString()
    };

    const { data: updatedMockup, error: updateError } = await supabaseServer
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Mockup updated successfully', { mockupId: id, mockupName });

    return successResponse({ mockup: updatedMockup });
  } catch (error) {
    return errorResponse(error, 'Failed to update mockup');
  }
}

/**
 * DELETE /api/mockups/[id]
 *
 * Delete a mockup
 *
 * Deletes both the database record and the file from storage
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/mockups/${id}`, 'DELETE', { orgId, userId });

    // Get the mockup to check ownership and get file URL
    const { data: mockup, error: fetchError } = await supabaseServer
      .from('assets')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    // Check if user owns this mockup (or if it's legacy data without created_by)
    if (mockup.created_by && mockup.created_by !== userId) {
      return forbiddenResponse('You do not have permission to delete this mockup');
    }

    // Delete the mockup image from storage
    if (mockup.mockup_image_url) {
      // Extract filename from URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/card-mockups/filename.png
      const url = mockup.mockup_image_url;
      const match = url.match(/\/card-mockups\/([^?]+)/);

      if (match && match[1]) {
        const { error: storageError } = await supabaseServer.storage
          .from('card-mockups')
          .remove([match[1]]);

        if (storageError) {
          logger.warn('Error deleting storage file, continuing with database deletion', { error: storageError });
          // Don't fail the whole operation if storage cleanup fails
        }
      }
    }

    // Delete the database record
    const { error: deleteError } = await supabaseServer
      .from('assets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return handleSupabaseError(deleteError);
    }

    logger.info('Mockup deleted successfully', { mockupId: id });

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to delete mockup');
  }
}
