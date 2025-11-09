/**
 * POST /api/integrations/gmail/connect
 * Initiate Gmail OAuth flow
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { initiateOAuthFlow } from '@/lib/integrations/oauth';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/gmail/connect
 * Initiate OAuth flow for Gmail
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    logger.api('/api/integrations/gmail/connect', 'POST', { userId, orgId });
    
    const { authorizationUrl, state } = initiateOAuthFlow('gmail');
    
    return successResponse({
      authorizationUrl,
      state,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to initiate Gmail OAuth flow');
  }
}

