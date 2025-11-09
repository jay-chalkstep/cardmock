/**
 * DocuSign API Client Setup
 * Handles authentication and client initialization
 */

import { ApiClient, OAuth, Configuration } from 'docusign-esign';

export interface DocuSignConfig {
  integrationKey: string;
  userId: string;
  accountId: string;
  rsaPrivateKey: string; // Base64 encoded private key
  apiBaseUrl: string; // 'https://demo.docusign.net/restapi' or 'https://www.docusign.net/restapi'
}

let apiClient: ApiClient | null = null;

/**
 * Initialize DocuSign API client
 */
export function initializeDocuSignClient(config: DocuSignConfig): ApiClient {
  if (apiClient) {
    return apiClient;
  }

  // Create API client
  apiClient = new ApiClient();
  apiClient.setBasePath(config.apiBaseUrl);

  // Set OAuth base path
  const oAuthBasePath = config.apiBaseUrl.replace('/restapi', '');
  apiClient.setOAuthBasePath(oAuthBasePath);

  // Decode RSA private key from base64
  const privateKey = Buffer.from(config.rsaPrivateKey, 'base64').toString('utf-8');

  // Create OAuth object
  const oAuth = new OAuth();
  const results = oAuth.requestJWTUserToken(
    config.integrationKey,
    config.userId,
    ['signature', 'impersonation'],
    privateKey,
    3600 // Token expires in 1 hour
  );

  // Set access token
  apiClient.addDefaultHeader('Authorization', `Bearer ${results.body.access_token}`);

  return apiClient;
}

/**
 * Get DocuSign API client from environment variables
 */
export function getDocuSignClient(): ApiClient {
  const config: DocuSignConfig = {
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY || '',
    userId: process.env.DOCUSIGN_USER_ID || '',
    accountId: process.env.DOCUSIGN_ACCOUNT_ID || '',
    rsaPrivateKey: process.env.DOCUSIGN_RSA_PRIVATE_KEY || '',
    apiBaseUrl: process.env.DOCUSIGN_API_BASE_URL || 'https://demo.docusign.net/restapi',
  };

  // Validate configuration
  if (!config.integrationKey || !config.userId || !config.accountId || !config.rsaPrivateKey) {
    throw new Error('DocuSign configuration is incomplete. Please check environment variables.');
  }

  return initializeDocuSignClient(config);
}

/**
 * Refresh access token if needed
 */
export async function refreshDocuSignToken(apiClient: ApiClient, config: DocuSignConfig): Promise<void> {
  const privateKey = Buffer.from(config.rsaPrivateKey, 'base64').toString('utf-8');
  const oAuth = new OAuth();
  
  const results = await oAuth.requestJWTUserToken(
    config.integrationKey,
    config.userId,
    ['signature', 'impersonation'],
    privateKey,
    3600
  );

  apiClient.addDefaultHeader('Authorization', `Bearer ${results.body.access_token}`);
}

