/**
 * DELETE /api/integrations/cloud-storage/[provider]/disconnect
 * Revoke cloud storage integration
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { revokeOAuthToken, IntegrationType } from '@/lib/integrations/oauth';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/integrations/cloud-storage/[provider]/disconnect
 * Revoke cloud storage OAuth connection
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { provider } = await context.params;
    
    if (provider !== 'drive' && provider !== 'dropbox') {
      return badRequestResponse('Invalid provider. Must be "drive" or "dropbox"');
    }
    
    logger.api(`/api/integrations/cloud-storage/${provider}/disconnect`, 'DELETE', { userId, orgId });
    
    const integrationType: IntegrationType = provider === 'drive' ? 'drive' : 'dropbox';
    const result = await revokeOAuthToken(integrationType, userId, orgId);
    
    if (!result.success) {
      return errorResponse(new Error(result.error || 'Failed to revoke connection'), `Failed to disconnect ${provider}`);
    }
    
    logger.info(`${provider} integration disconnected`, { userId, orgId });
    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to disconnect cloud storage integration');
  }
}

