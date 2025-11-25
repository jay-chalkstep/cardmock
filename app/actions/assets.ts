'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/lib/api/auth';

/**
 * Server Action to delete an asset
 */
export async function deleteAsset(assetId: string) {
  try {
    const { userId, orgId } = await getAuthContext();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const supabase = createServerClient();

    // Get the asset to find its image URL
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('mockup_image_url')
      .eq('id', assetId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError) {
      console.error('Error fetching asset:', fetchError);
      return { error: 'Asset not found' };
    }

    // Delete from storage if there's an image
    if (asset?.mockup_image_url) {
      const urlParts = asset.mockup_image_url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      const { error: storageError } = await supabase.storage
        .from('card-mockups')
        .remove([`${orgId}/${fileName}`]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId)
      .eq('organization_id', orgId);

    if (deleteError) {
      console.error('Error deleting asset:', deleteError);
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

/**
 * Server Action to move an asset to a different folder
 */
export async function moveAsset(assetId: string, folderId: string | null) {
  try {
    const { userId, orgId } = await getAuthContext();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('assets')
      .update({ folder_id: folderId })
      .eq('id', assetId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error moving asset:', error);
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
 * Server Action to delete multiple assets
 */
export async function deleteAssets(assetIds: string[]) {
  try {
    const { userId, orgId } = await getAuthContext();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    if (!assetIds || assetIds.length === 0) {
      return { error: 'No assets selected' };
    }

    const supabase = createServerClient();

    // Get all assets to find their image URLs
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('id, mockup_image_url')
      .in('id', assetIds)
      .eq('organization_id', orgId);

    if (fetchError) {
      console.error('Error fetching assets:', fetchError);
      return { error: 'Failed to fetch assets' };
    }

    // Delete from storage
    const storageFiles = assets
      ?.filter(a => a.mockup_image_url)
      .map(a => {
        const urlParts = a.mockup_image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        return `${orgId}/${fileName}`;
      }) || [];

    if (storageFiles.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('card-mockups')
        .remove(storageFiles);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .in('id', assetIds)
      .eq('organization_id', orgId);

    if (deleteError) {
      console.error('Error deleting assets:', deleteError);
      return { error: deleteError.message };
    }

    revalidatePath('/gallery');
    revalidatePath('/projects');

    return { success: true, count: assetIds.length };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server Action to update an asset's project assignment
 */
export async function updateAssetProject(assetId: string, projectId: string | null) {
  try {
    const { userId, orgId } = await getAuthContext();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('assets')
      .update({ project_id: projectId })
      .eq('id', assetId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error updating asset project:', error);
      return { error: error.message };
    }

    revalidatePath('/gallery');
    revalidatePath('/projects');
    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server Action to move multiple assets
 */
export async function moveAssets(assetIds: string[], folderId: string | null) {
  try {
    const { userId, orgId } = await getAuthContext();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    if (!assetIds || assetIds.length === 0) {
      return { error: 'No assets selected' };
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('assets')
      .update({ folder_id: folderId })
      .in('id', assetIds)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error moving assets:', error);
      return { error: error.message };
    }

    revalidatePath('/gallery');
    revalidatePath('/projects');

    return { success: true, count: assetIds.length };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}