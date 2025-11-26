'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getAuthContextOrThrow } from '@/lib/api/auth';

/**
 * Server Action to create a new folder
 */
export async function createFolder(formData: FormData) {
  try {
    const { userId, orgId } = await getAuthContextOrThrow();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const parentId = formData.get('parentId') as string | null;
    const isOrgShared = formData.get('isOrgShared') === 'true';

    if (!name || name.trim().length === 0) {
      return { error: 'Folder name is required' };
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('folders')
      .insert({
        name: name.trim(),
        parent_folder_id: parentId,
        created_by: userId,
        organization_id: orgId,
        is_org_shared: isOrgShared
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      return { error: error.message };
    }

    // Revalidate the gallery page to show the new folder
    revalidatePath('/gallery');
    revalidatePath('/projects');

    return { success: true, data };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server Action to rename a folder
 */
export async function renameFolder(folderId: string, newName: string) {
  try {
    const { userId, orgId } = await getAuthContextOrThrow();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    if (!newName || newName.trim().length === 0) {
      return { error: 'Folder name is required' };
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('folders')
      .update({ name: newName.trim() })
      .eq('id', folderId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error renaming folder:', error);
      return { error: error.message };
    }

    revalidatePath('/gallery');
    revalidatePath('/projects');

    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server Action to delete a folder
 */
export async function deleteFolder(folderId: string) {
  try {
    const { userId, orgId } = await getAuthContextOrThrow();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const supabase = createServerClient();

    // First, update any assets in this folder to be unsorted
    const { error: updateError } = await supabase
      .from('assets')
      .update({ folder_id: null })
      .eq('folder_id', folderId)
      .eq('organization_id', orgId);

    if (updateError) {
      console.error('Error updating assets:', updateError);
      return { error: 'Failed to relocate assets' };
    }

    // Then delete the folder (CASCADE will handle subfolders)
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('organization_id', orgId);

    if (deleteError) {
      console.error('Error deleting folder:', deleteError);
      return { error: deleteError.message };
    }

    revalidatePath('/gallery');
    revalidatePath('/projects');

    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}