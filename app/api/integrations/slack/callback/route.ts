/**
 * GET /api/integrations/slack/callback
 * Handle Slack OAuth callback
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { badRequestResponse } from '@/lib/api/response';
import { handleOAuthCallback } from '@/lib/integrations/oauth';
import { supabaseServer } from '@/lib/supabase-server';
import { encryptCredentials } from '@/lib/integrations/encryption';
import { logger } from '@/lib/utils/logger';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/slack/callback
 * Handle OAuth callback from Slack
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
      logger.error('Slack OAuth error', { error, userId, orgId });
      return redirect(`/settings/integrations/slack?error=${encodeURIComponent(error)}`);
    }
    
    if (!code || !state) {
      return badRequestResponse('Missing code or state parameter');
    }
    
    logger.api('/api/integrations/slack/callback', 'GET', { userId, orgId });
    
    // Slack OAuth uses different token endpoint format
    const config = {
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/slack/callback`,
    };
    
    // Exchange code for tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      logger.error('Slack token exchange failed', { error });
      return redirect(`/settings/integrations/slack?error=${encodeURIComponent('Failed to exchange authorization code')}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.ok) {
      logger.error('Slack OAuth error', { error: tokenData.error });
      return redirect(`/settings/integrations/slack?error=${encodeURIComponent(tokenData.error || 'OAuth failed')}`);
    }
    
    // Encrypt and store credentials
    const credentials = {
      access_token: tokenData.access_token,
      bot_token: tokenData.bot?.bot_access_token,
      team: tokenData.team,
      authed_user: tokenData.authed_user,
    };
    
    const encryptedCredentials = encryptCredentials(credentials);
    const encryptedBotToken = tokenData.bot?.bot_access_token
      ? encryptCredentials({ bot_token: tokenData.bot.bot_access_token })
      : null;
    
    // Store in database
    const { error: dbError } = await supabaseServer
      .from('slack_integrations')
      .upsert({
        organization_id: orgId,
        workspace_id: tokenData.team?.id || '',
        workspace_name: tokenData.team?.name || '',
        bot_token_encrypted: encryptedBotToken || encryptedCredentials,
        access_token_encrypted: encryptedCredentials,
      }, {
        onConflict: 'organization_id,workspace_id',
      });
    
    if (dbError) {
      logger.error('Failed to store Slack credentials', { error: dbError });
      return redirect(`/settings/integrations/slack?error=${encodeURIComponent('Failed to store credentials')}`);
    }
    
    logger.info('Slack OAuth connection successful', { userId, orgId });
    return redirect('/settings/integrations/slack?success=true');
  } catch (error) {
    logger.error('Slack OAuth callback error', error);
    return redirect('/settings/integrations/slack?error=unknown');
  }
}

