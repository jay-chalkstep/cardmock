/**
 * GET /api/integrations/gmail/callback
 * Handle Gmail OAuth callback
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { badRequestResponse } from '@/lib/api/response';
import { handleOAuthCallback } from '@/lib/integrations/oauth';
import { logger } from '@/lib/utils/logger';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/gmail/callback
 * Handle OAuth callback from Gmail
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
      logger.error('Gmail OAuth error', { error, userId, orgId });
      return redirect(`/settings/integrations/gmail?error=${encodeURIComponent(error)}`);
    }
    
    if (!code || !state) {
      return badRequestResponse('Missing code or state parameter');
    }
    
    logger.api('/api/integrations/gmail/callback', 'GET', { userId, orgId });
    
    const result = await handleOAuthCallback('gmail', code, state, userId, orgId);
    
    if (!result.success) {
      logger.error('Gmail OAuth callback failed', { error: result.error, userId, orgId });
      return redirect(`/settings/integrations/gmail?error=${encodeURIComponent(result.error || 'OAuth failed')}`);
    }
    
    logger.info('Gmail OAuth connection successful', { userId, orgId });
    return redirect('/settings/integrations/gmail?success=true');
  } catch (error) {
    logger.error('Gmail OAuth callback error', error);
    return redirect('/settings/integrations/gmail?error=unknown');
  }
}

