/**
 * DELETE /api/integrations/figma/disconnect
 * Revoke Figma integration
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { revokeOAuthToken } from '@/lib/integrations/oauth';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/integrations/figma/disconnect
 * Revoke Figma OAuth connection
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    logger.api('/api/integrations/figma/disconnect', 'DELETE', { userId, orgId });
    
    const result = await revokeOAuthToken('figma', userId, orgId);
    
    if (!result.success) {
      return errorResponse(new Error(result.error || 'Failed to revoke connection'), 'Failed to disconnect Figma');
    }
    
    logger.info('Figma integration disconnected', { userId, orgId });
    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to disconnect Figma integration');
  }
}

