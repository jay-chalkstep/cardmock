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
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      const errorMessage = errorDescription || error;
      logger.error('Figma OAuth error', { error, errorDescription, userId, orgId });
      return redirect(`/settings/integrations/figma?error=${encodeURIComponent(errorMessage)}`);
    }
    
    if (!code || !state) {
      logger.error('Missing OAuth parameters', { hasCode: !!code, hasState: !!state, userId, orgId });
      return redirect(`/settings/integrations/figma?error=${encodeURIComponent('Missing authorization code or state parameter')}`);
    }
    
    logger.api('/api/integrations/figma/callback', 'GET', { userId, orgId, hasCode: !!code, hasState: !!state });
    
    const result = await handleOAuthCallback('figma', code, state, userId, orgId);
    
    if (!result.success) {
      const errorMessage = result.error || 'OAuth connection failed';
      logger.error('Figma OAuth callback failed', { error: result.error, userId, orgId });
      return redirect(`/settings/integrations/figma?error=${encodeURIComponent(errorMessage)}`);
    }
    
    logger.info('Figma OAuth connection successful', { userId, orgId });
    return redirect('/settings/integrations/figma?success=true');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Figma OAuth callback error', error, { errorMessage });
    return redirect(`/settings/integrations/figma?error=${encodeURIComponent(errorMessage)}`);
  }
}

