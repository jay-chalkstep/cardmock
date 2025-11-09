/**
 * GET /api/integrations/cloud-storage/[provider]/callback
 * Handle cloud storage OAuth callback
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { badRequestResponse } from '@/lib/api/response';
import { handleOAuthCallback, IntegrationType } from '@/lib/integrations/oauth';
import { logger } from '@/lib/utils/logger';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/cloud-storage/[provider]/callback
 * Handle OAuth callback from cloud storage provider
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { provider } = await context.params;
    
    if (provider !== 'drive' && provider !== 'dropbox') {
      return badRequestResponse('Invalid provider');
    }
    
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      logger.error(`${provider} OAuth error`, { error, userId, orgId });
      return redirect(`/settings/integrations/cloud-storage?error=${encodeURIComponent(error)}`);
    }
    
    if (!code || !state) {
      return badRequestResponse('Missing code or state parameter');
    }
    
    logger.api(`/api/integrations/cloud-storage/${provider}/callback`, 'GET', { userId, orgId });
    
    const integrationType: IntegrationType = provider === 'drive' ? 'drive' : 'dropbox';
    const result = await handleOAuthCallback(integrationType, code, state, userId, orgId);
    
    if (!result.success) {
      logger.error(`${provider} OAuth callback failed`, { error: result.error, userId, orgId });
      return redirect(`/settings/integrations/cloud-storage?error=${encodeURIComponent(result.error || 'OAuth failed')}`);
    }
    
    logger.info(`${provider} OAuth connection successful`, { userId, orgId });
    return redirect('/settings/integrations/cloud-storage?success=true');
  } catch (error) {
    logger.error('Cloud storage OAuth callback error', error);
    return redirect('/settings/integrations/cloud-storage?error=unknown');
  }
}

