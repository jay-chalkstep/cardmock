/**
 * POST /api/integrations/cloud-storage/[provider]/connect
 * Initiate cloud storage OAuth flow
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { initiateOAuthFlow, IntegrationType } from '@/lib/integrations/oauth';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/cloud-storage/[provider]/connect
 * Initiate OAuth flow for cloud storage (drive or dropbox)
 */
export async function POST(
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
    
    logger.api(`/api/integrations/cloud-storage/${provider}/connect`, 'POST', { userId, orgId });
    
    const integrationType: IntegrationType = provider === 'drive' ? 'drive' : 'dropbox';
    const { authorizationUrl, state } = initiateOAuthFlow(integrationType);
    
    return successResponse({
      authorizationUrl,
      state,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to initiate cloud storage OAuth flow');
  }
}

