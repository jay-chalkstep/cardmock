import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, forbiddenResponse } from '@/lib/api/response';
import { createServerAdminClient } from '@/lib/supabase/server';
import { TEMPLATE_TYPES, getAllTemplateTypes } from '@/lib/templateTypes';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/template-types
 * Get all available template types
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;

    // Return template types from the static configuration
    // These are also stored in the database but the static config is authoritative
    const templateTypes = getAllTemplateTypes();

    return successResponse({
      templateTypes,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch template types');
  }
}
