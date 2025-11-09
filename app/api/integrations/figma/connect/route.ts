/**
 * POST /api/integrations/figma/connect
 * Initiate Figma OAuth flow
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { initiateOAuthFlow } from '@/lib/integrations/oauth';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/figma/connect
 * Initiate OAuth flow for Figma
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    logger.api('/api/integrations/figma/connect', 'POST', { userId, orgId });
    
    const { authorizationUrl, state } = initiateOAuthFlow('figma');
    
    // Store state in session or database for verification in callback
    // For now, we'll return it to the client to include in callback
    
    return successResponse({
      authorizationUrl,
      state,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to initiate Figma OAuth flow');
  }
}

