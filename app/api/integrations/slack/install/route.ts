/**
 * GET /api/integrations/slack/install
 * Initiate Slack OAuth install
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { initiateOAuthFlow } from '@/lib/integrations/oauth';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/slack/install
 * Initiate OAuth install for Slack
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    logger.api('/api/integrations/slack/install', 'GET', { userId, orgId });
    
    const { authorizationUrl, state } = initiateOAuthFlow('slack');
    
    return successResponse({
      authorizationUrl,
      state,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to initiate Slack OAuth install');
  }
}

