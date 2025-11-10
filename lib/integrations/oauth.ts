/**
 * OAuth flow helpers for platform integrations
 * Provides standardized OAuth 2.0 flow management
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { encryptCredentials, decryptCredentials } from './encryption';
import { logger } from '@/lib/utils/logger';
import { errorResponse, successResponse, badRequestResponse } from '@/lib/api/response';

export type IntegrationType = 'figma' | 'gmail' | 'slack' | 'drive' | 'dropbox';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Get OAuth configuration for an integration type
 */
export function getOAuthConfig(integrationType: IntegrationType): OAuthConfig {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  switch (integrationType) {
    case 'figma':
      return {
        clientId: process.env.FIGMA_CLIENT_ID || '',
        clientSecret: process.env.FIGMA_CLIENT_SECRET || '',
        authorizationUrl: 'https://www.figma.com/oauth',
        tokenUrl: 'https://www.figma.com/api/oauth/token',
        redirectUri: `${baseUrl}/api/integrations/figma/callback`,
        scopes: ['file_content:read', 'file_metadata:read'],
      };
    case 'gmail':
      return {
        clientId: process.env.GMAIL_CLIENT_ID || '',
        clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        redirectUri: `${baseUrl}/api/integrations/gmail/callback`,
        scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'],
      };
    case 'slack':
      return {
        clientId: process.env.SLACK_CLIENT_ID || '',
        clientSecret: process.env.SLACK_CLIENT_SECRET || '',
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        redirectUri: `${baseUrl}/api/integrations/slack/callback`,
        scopes: ['chat:write', 'channels:read', 'commands'],
      };
    case 'drive':
      return {
        clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        redirectUri: `${baseUrl}/api/integrations/cloud-storage/drive/callback`,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      };
    case 'dropbox':
      return {
        clientId: process.env.DROPBOX_CLIENT_ID || '',
        clientSecret: process.env.DROPBOX_CLIENT_SECRET || '',
        authorizationUrl: 'https://www.dropbox.com/oauth2/authorize',
        tokenUrl: 'https://api.dropbox.com/oauth2/token',
        redirectUri: `${baseUrl}/api/integrations/cloud-storage/dropbox/callback`,
        scopes: ['files.content.read'],
      };
    default:
      throw new Error(`Unknown integration type: ${integrationType}`);
  }
}

/**
 * Initiate OAuth flow - generate authorization URL
 */
export function initiateOAuthFlow(
  integrationType: IntegrationType,
  state?: string
): { authorizationUrl: string; state: string } {
  const config = getOAuthConfig(integrationType);
  const generatedState = state || crypto.randomUUID();
  
  // Build base OAuth parameters
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    state: generatedState,
  });
  
  // Add scope parameter for all integrations (including Figma)
  if (config.scopes.length > 0) {
    params.append('scope', config.scopes.join(' '));
  }
  
  // Add OAuth2-specific parameters only for Google-based integrations
  if (integrationType === 'gmail' || integrationType === 'drive') {
    params.append('access_type', 'offline'); // For refresh tokens
    params.append('prompt', 'consent'); // Force consent screen to get refresh token
  }
  
  const authorizationUrl = `${config.authorizationUrl}?${params.toString()}`;
  
  return {
    authorizationUrl,
    state: generatedState,
  };
}

/**
 * Handle OAuth callback - exchange code for tokens
 */
export async function handleOAuthCallback(
  integrationType: IntegrationType,
  code: string,
  state: string,
  userId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getOAuthConfig(integrationType);
    
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
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      logger.error('OAuth token exchange failed', { integrationType, error });
      return { success: false, error: 'Failed to exchange authorization code for tokens' };
    }
    
    const tokenData = await tokenResponse.json();
    
    // Encrypt and store credentials
    const credentials = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    };
    
    const encryptedCredentials = encryptCredentials(credentials);
    const encryptedRefreshToken = tokenData.refresh_token
      ? encryptCredentials({ refresh_token: tokenData.refresh_token })
      : null;
    
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;
    
    // Store in database
    const { error: dbError } = await supabaseServer
      .from('integration_credentials')
      .upsert({
        organization_id: orgId,
        user_id: userId,
        integration_type: integrationType,
        credentials_encrypted: encryptedCredentials,
        refresh_token_encrypted: encryptedRefreshToken,
        expires_at: expiresAt,
        metadata_jsonb: {
          provider_user_id: tokenData.user_id || tokenData.account_id,
          state,
        },
      }, {
        onConflict: 'organization_id,integration_type,user_id',
      });
    
    if (dbError) {
      logger.error('Failed to store OAuth credentials', { integrationType, error: dbError });
      return { success: false, error: 'Failed to store credentials' };
    }
    
    logger.info('OAuth connection successful', { integrationType, userId, orgId });
    return { success: true };
  } catch (error) {
    logger.error('OAuth callback error', error, { integrationType });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Refresh OAuth token
 */
export async function refreshOAuthToken(
  integrationType: IntegrationType,
  userId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get stored credentials
    const { data: credential, error: fetchError } = await supabaseServer
      .from('integration_credentials')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('integration_type', integrationType)
      .single();
    
    if (fetchError || !credential) {
      return { success: false, error: 'Integration not found' };
    }
    
    const oldCredentials = decryptCredentials(credential.credentials_encrypted);
    const refreshTokenData = credential.refresh_token_encrypted
      ? decryptCredentials(credential.refresh_token_encrypted)
      : null;
    
    const refreshToken = refreshTokenData?.refresh_token || oldCredentials.refresh_token;
    
    if (!refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }
    
    const config = getOAuthConfig(integrationType);
    
    // Refresh token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken as string,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      logger.error('OAuth token refresh failed', { integrationType, error });
      return { success: false, error: 'Failed to refresh token' };
    }
    
    const tokenData = await tokenResponse.json();
    
    // Update credentials
    const credentials = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token || refreshToken,
      scope: tokenData.scope,
    };
    
    const encryptedCredentials = encryptCredentials(credentials);
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;
    
    const { error: updateError } = await supabaseServer
      .from('integration_credentials')
      .update({
        credentials_encrypted: encryptedCredentials,
        expires_at: expiresAt,
      })
      .eq('id', credential.id);
    
    if (updateError) {
      logger.error('Failed to update refreshed credentials', { integrationType, error: updateError });
      return { success: false, error: 'Failed to update credentials' };
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Token refresh error', error, { integrationType });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Revoke OAuth token and remove credentials
 */
export async function revokeOAuthToken(
  integrationType: IntegrationType,
  userId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get stored credentials
    const { data: credential, error: fetchError } = await supabaseServer
      .from('integration_credentials')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('integration_type', integrationType)
      .single();
    
    if (fetchError || !credential) {
      return { success: false, error: 'Integration not found' };
    }
    
    // Try to revoke token with provider (optional - some providers don't support this)
    try {
      const credentials = decryptCredentials(credential.credentials_encrypted);
      const accessToken = credentials.access_token as string;
      
      // Provider-specific revocation endpoints
      const revokeUrls: Record<IntegrationType, string> = {
        figma: 'https://www.figma.com/api/oauth/revoke',
        gmail: 'https://oauth2.googleapis.com/revoke',
        slack: 'https://slack.com/api/auth.revoke',
        drive: 'https://oauth2.googleapis.com/revoke',
        dropbox: 'https://api.dropbox.com/2/auth/token/revoke',
      };
      
      if (revokeUrls[integrationType]) {
        await fetch(revokeUrls[integrationType], {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: accessToken,
          }),
        });
      }
    } catch (revokeError) {
      // Log but don't fail - revocation is optional
      logger.warn('Failed to revoke token with provider', { integrationType, error: revokeError });
    }
    
    // Delete from database
    const { error: deleteError } = await supabaseServer
      .from('integration_credentials')
      .delete()
      .eq('id', credential.id);
    
    if (deleteError) {
      logger.error('Failed to delete credentials', { integrationType, error: deleteError });
      return { success: false, error: 'Failed to delete credentials' };
    }
    
    logger.info('OAuth token revoked', { integrationType, userId, orgId });
    return { success: true };
  } catch (error) {
    logger.error('Token revocation error', error, { integrationType });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get decrypted credentials for an integration
 */
export async function getIntegrationCredentials(
  integrationType: IntegrationType,
  userId: string,
  orgId: string
): Promise<Record<string, unknown> | null> {
  try {
    const { data: credential, error } = await supabaseServer
      .from('integration_credentials')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('integration_type', integrationType)
      .single();
    
    if (error || !credential) {
      return null;
    }
    
    // Check if token is expired and refresh if needed
    if (credential.expires_at && new Date(credential.expires_at) < new Date()) {
      const refreshResult = await refreshOAuthToken(integrationType, userId, orgId);
      if (!refreshResult.success) {
        logger.warn('Failed to refresh expired token', { integrationType });
        return null;
      }
      // Fetch again after refresh
      const { data: refreshedCredential } = await supabaseServer
        .from('integration_credentials')
        .select('*')
        .eq('id', credential.id)
        .single();
      
      if (!refreshedCredential) {
        return null;
      }
      
      return decryptCredentials(refreshedCredential.credentials_encrypted);
    }
    
    return decryptCredentials(credential.credentials_encrypted);
  } catch (error) {
    logger.error('Failed to get integration credentials', error, { integrationType });
    return null;
  }
}

