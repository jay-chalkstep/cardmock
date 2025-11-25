'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/lib/api/auth';

/**
 * Server Action to create a new project
 */
export async function createProject(formData: FormData) {
  try {
    const { userId, orgId } = await getAuthContext();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const clientId = formData.get('clientId') as string;
    const clientName = formData.get('clientName') as string | null;
    const description = formData.get('description') as string | null;
    const color = formData.get('color') as string || '#3B82F6';
    const workflowId = formData.get('workflowId') as string | null;

    if (!name || name.trim().length === 0) {
      return { error: 'Project name is required' };
    }

    if (!clientId || clientId.trim().length === 0) {
      return { error: 'Client ID is required' };
    }

    const supabase = createServerClient();

    // Validate client exists and belongs to organization
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .eq('organization_id', orgId)
      .single();

    if (clientError || !client) {
      return { error: 'Client not found or does not belong to this organization' };
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        client_id: clientId, // Required - direct relationship to client
        client_name: clientName?.trim() || client.name || null, // Optional display field, default to client name
        description: description?.trim() || null,
        color,
        workflow_id: workflowId,
        organization_id: orgId,
        created_by: userId,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return { error: error.message };
    }

    revalidatePath('/projects');
    revalidatePath('/gallery');

    return { success: true, data };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server Action to update a project
 */
export async function updateProject(projectId: string, formData: FormData) {
  try {
    const { userId, orgId } = await getAuthContext();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const clientName = formData.get('clientName') as string | null;
    const description = formData.get('description') as string | null;
    const color = formData.get('color') as string;
    const status = formData.get('status') as 'active' | 'completed' | 'archived';

    if (!name || name.trim().length === 0) {
      return { error: 'Project name is required' };
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('projects')
      .update({
        name: name.trim(),
        client_name: clientName?.trim(),
        description: description?.trim(),
        color,
        status
      })
      .eq('id', projectId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error updating project:', error);
      return { error: error.message };
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server Action to archive a project
 */
export async function archiveProject(projectId: string) {
  try {
    const { userId, orgId } = await getAuthContext();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', projectId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error archiving project:', error);
      return { error: error.message };
    }

    revalidatePath('/projects');

    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server Action to delete a project
 */
export async function deleteProject(projectId: string) {
  try {
    const { userId, orgId } = await getAuthContext();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const supabase = createServerClient();

    // First, unlink any assets from this project
    const { error: unlinkError } = await supabase
      .from('assets')
      .update({ project_id: null })
      .eq('project_id', projectId)
      .eq('organization_id', orgId);

    if (unlinkError) {
      console.error('Error unlinking assets:', unlinkError);
      return { error: 'Failed to unlink assets' };
    }

    // Then delete the project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('organization_id', orgId);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return { error: deleteError.message };
    }

    revalidatePath('/projects');

    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}