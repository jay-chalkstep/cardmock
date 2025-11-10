/**
 * GET /api/integrations/figma/files/[fileKey]/frames/[nodeId]/export
 * Export a Figma frame as image
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getFigmaAccessToken, exportFigmaFrame } from '@/lib/integrations/figma';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/figma/files/[fileKey]/frames/[nodeId]/export
 * Export a frame as image
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileKey: string; nodeId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const { fileKey, nodeId } = await context.params;

    logger.api(`/api/integrations/figma/files/${fileKey}/frames/${nodeId}/export`, 'GET', { userId, orgId });

    // Get Figma access token
    const accessToken = await getFigmaAccessToken(userId, orgId);
    if (!accessToken) {
      return errorResponse(new Error('Figma integration not connected'), 'Figma integration not connected');
    }

    // Export frame
    const imageUrl = await exportFigmaFrame(accessToken, fileKey, nodeId);

    return successResponse({
      imageUrl,
      fileKey,
      nodeId,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to export Figma frame');
  }
}

