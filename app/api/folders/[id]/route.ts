import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabase } from '@/lib/supabase';
import { validateFolderName } from '@/lib/folders';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/folders/[id]
 *
 * Update a folder (rename or toggle sharing)
 *
 * Body:
 * {
 *   name?: string (rename folder),
 *   is_org_shared?: boolean (toggle org sharing, admin only)
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
    const { name, is_org_shared } = body;

    logger.api(`/api/folders/${id}`, 'PATCH', { orgId, userId });

    // Get the folder to check ownership
    const { data: folder, error: fetchError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !folder) {
      return notFoundResponse('Folder not found');
    }

    // Check permissions
    const userIsAdmin = await isAdmin();
    const canEdit = folder.created_by === userId || (userIsAdmin && folder.is_org_shared);

    if (!canEdit) {
      return forbiddenResponse('You do not have permission to edit this folder');
    }

    // Prepare update data
    const updateData: any = {};

    // Handle rename
    if (name !== undefined) {
      const nameError = validateFolderName(name);
      if (nameError) {
        return badRequestResponse(nameError);
      }

      // Check for duplicate name
      const { data: existing } = await supabase
        .from('folders')
        .select('id')
        .eq('name', name)
        .eq('created_by', folder.created_by)
        .eq('organization_id', orgId)
        .eq('parent_folder_id', folder.parent_folder_id || null)
        .neq('id', id)
        .single();

      if (existing) {
        return badRequestResponse('A folder with this name already exists in this location');
      }

      updateData.name = name;
    }

    // Handle org sharing (admin only)
    if (is_org_shared !== undefined) {
      if (!userIsAdmin) {
        return forbiddenResponse('Only admins can change folder sharing settings');
      }

      updateData.is_org_shared = is_org_shared;
    }

    // Perform update
    const { data: updatedFolder, error: updateError } = await supabase
      .from('folders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Folder updated successfully', { folderId: id });

    return successResponse({ folder: updatedFolder });
  } catch (error) {
    return errorResponse(error, 'Failed to update folder');
  }
}

/**
 * DELETE /api/folders/[id]
 *
 * Delete a folder
 *
 * Note: Mockups in the folder will have their folder_id set to NULL (unsorted)
 * due to ON DELETE SET NULL constraint
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

    logger.api(`/api/folders/${id}`, 'DELETE', { orgId, userId });

    // Get the folder to check ownership
    const { data: folder, error: fetchError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !folder) {
      return notFoundResponse('Folder not found');
    }

    // Check permissions
    const userIsAdmin = await isAdmin();
    const canDelete = folder.created_by === userId || (userIsAdmin && folder.is_org_shared);

    if (!canDelete) {
      return forbiddenResponse('You do not have permission to delete this folder');
    }

    // Delete the folder (cascades to subfolders, mockups set to NULL)
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return handleSupabaseError(deleteError);
    }

    logger.info('Folder deleted successfully', { folderId: id });

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to delete folder');
  }
}
