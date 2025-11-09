/**
 * DocuSign API Client Setup
 * Handles authentication and client initialization
 * 
 * NOTE: DocuSign integration is temporarily disabled
 * Uncomment the import below when docusign-esign package is properly configured
 */

// import { ApiClient, OAuth, Configuration } from 'docusign-esign';

export interface DocuSignConfig {
  integrationKey: string;
  userId: string;
  accountId: string;
  rsaPrivateKey: string; // Base64 encoded private key
  apiBaseUrl: string; // 'https://demo.docusign.net/restapi' or 'https://www.docusign.net/restapi'
}

// Temporarily disabled - uncomment when docusign-esign is properly configured
// let apiClient: ApiClient | null = null;

/**
 * Initialize DocuSign API client
 * NOTE: Temporarily disabled - returns error when called
 */
export function initializeDocuSignClient(config: DocuSignConfig): any {
  throw new Error('DocuSign integration is temporarily disabled. Please configure docusign-esign package.');
  
  /* Uncomment when docusign-esign is available:
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
  */
}

/**
 * Get DocuSign API client from environment variables
 * NOTE: Temporarily disabled - returns error when called
 */
export function getDocuSignClient(): any {
  throw new Error('DocuSign integration is temporarily disabled. Please configure docusign-esign package.');
  
  /* Uncomment when docusign-esign is available:
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
  */
}

/**
 * Refresh access token if needed
 * NOTE: Temporarily disabled
 */
export async function refreshDocuSignToken(apiClient: any, config: DocuSignConfig): Promise<void> {
  throw new Error('DocuSign integration is temporarily disabled. Please configure docusign-esign package.');
  
  /* Uncomment when docusign-esign is available:
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
  */
}

