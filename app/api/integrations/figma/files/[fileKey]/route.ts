/**
 * GET /api/integrations/figma/files/[fileKey]
 * Fetch frames from a specific Figma file
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getFigmaAccessToken, fetchFigmaFileStructure, extractFramesFromFile } from '@/lib/integrations/figma';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/figma/files/[fileKey]
 * Get frames from a Figma file
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileKey: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const { fileKey } = await context.params;

    logger.api(`/api/integrations/figma/files/${fileKey}`, 'GET', { userId, orgId });

    // Get Figma access token
    const accessToken = await getFigmaAccessToken(userId, orgId);
    if (!accessToken) {
      return errorResponse(new Error('Figma integration not connected'), 'Figma integration not connected');
    }

    // Fetch file structure
    const fileStructure = await fetchFigmaFileStructure(accessToken, fileKey);

    // Extract frames
    const frames = extractFramesFromFile(fileStructure);

    return successResponse({
      fileKey,
      fileName: fileStructure.name || 'Untitled File',
      frames,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch Figma file frames');
  }
}

