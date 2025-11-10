/**
 * GET /api/integrations/figma/files
 * Fetch user's Figma files
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getFigmaAccessToken, fetchFigmaFiles } from '@/lib/integrations/figma';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/figma/files
 * Get list of user's Figma files
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    logger.api('/api/integrations/figma/files', 'GET', { userId, orgId });

    // Get Figma access token
    const accessToken = await getFigmaAccessToken(userId, orgId);
    if (!accessToken) {
      return errorResponse(new Error('Figma integration not connected'), 'Figma integration not connected');
    }

    // Fetch files from Figma API
    // Note: Figma API doesn't have a direct "list all files" endpoint
    // This would typically require using team/files or user's recent files
    // For now, we'll return an empty array and let the user select files by key
    // In a real implementation, you'd need to store file keys or use team endpoints
    
    // Try to fetch from team files (if user has team access)
    try {
      const files = await fetchFigmaFiles(accessToken);
      return successResponse({ files });
    } catch (error) {
      // If team files fail, return empty array - user will need to provide file key
      logger.warn('Could not fetch Figma files, user may need to provide file key', { error });
      return successResponse({ files: [] });
    }
  } catch (error) {
    return errorResponse(error, 'Failed to fetch Figma files');
  }
}

