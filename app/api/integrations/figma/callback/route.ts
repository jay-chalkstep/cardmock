/**
 * GET /api/integrations/figma/callback
 * Handle Figma OAuth callback
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { handleOAuthCallback } from '@/lib/integrations/oauth';
import { logger } from '@/lib/utils/logger';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/figma/callback
 * Handle OAuth callback from Figma
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      logger.error('Figma OAuth error', { error, userId, orgId });
      return redirect(`/settings/integrations/figma?error=${encodeURIComponent(error)}`);
    }
    
    if (!code || !state) {
      return badRequestResponse('Missing code or state parameter');
    }
    
    logger.api('/api/integrations/figma/callback', 'GET', { userId, orgId });
    
    const result = await handleOAuthCallback('figma', code, state, userId, orgId);
    
    if (!result.success) {
      logger.error('Figma OAuth callback failed', { error: result.error, userId, orgId });
      return redirect(`/settings/integrations/figma?error=${encodeURIComponent(result.error || 'OAuth failed')}`);
    }
    
    logger.info('Figma OAuth connection successful', { userId, orgId });
    return redirect('/settings/integrations/figma?success=true');
  } catch (error) {
    logger.error('Figma OAuth callback error', error);
    return redirect('/settings/integrations/figma?error=unknown');
  }
}

