import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabase } from '@/lib/supabase';
import { getUserFolders, validateFolderName } from '@/lib/folders';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/folders
 *
 * Get all folders for the current user (personal + org-shared)
 * with mockup counts
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    logger.api('/api/folders', 'GET', { orgId, userId });

    const folders = await getUserFolders(userId, orgId);

    return successResponse({ folders });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch folders');
  }
}

/**
 * POST /api/folders
 *
 * Create a new folder
 *
 * Body:
 * {
 *   name: string,
 *   parent_folder_id?: string (optional),
 *   is_org_shared?: boolean (optional, admin only)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await request.json();
    const { name, parent_folder_id, is_org_shared } = body;

    logger.api('/api/folders', 'POST', { orgId, userId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['name']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    // Validate folder name
    const nameError = validateFolderName(name);
    if (nameError) {
      return badRequestResponse(nameError);
    }

    // Check if folder with same name already exists for this user
    const { data: existing } = await supabase
      .from('folders')
      .select('id')
      .eq('name', name)
      .eq('created_by', userId)
      .eq('organization_id', orgId)
      .eq('parent_folder_id', parent_folder_id || null)
      .single();

    if (existing) {
      return badRequestResponse('A folder with this name already exists in this location');
    }

    // Create folder
    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        name,
        created_by: userId,
        organization_id: orgId,
        parent_folder_id: parent_folder_id || null,
        is_org_shared: is_org_shared || false,
      })
      .select()
      .single();

    if (error) {
      // Check if this is a depth limit error
      if (error.message.includes('Maximum folder nesting depth')) {
        return badRequestResponse('Maximum folder nesting depth (5 levels) exceeded');
      }

      return handleSupabaseError(error);
    }

    logger.info('Folder created successfully', { folderId: folder.id, name });

    return successResponse({ folder }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create folder');
  }
}
