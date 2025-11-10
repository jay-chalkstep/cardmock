import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { decryptCredentials } from '@/lib/integrations/encryption';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/slack/channels
 * Get list of Slack channels for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    logger.api('/api/integrations/slack/channels', 'GET', { orgId });
    
    // Get Slack integration
    const { data: integration, error: fetchError } = await supabaseServer
      .from('slack_integrations')
      .select('*')
      .eq('organization_id', orgId)
      .single();
    
    if (fetchError || !integration) {
      return successResponse({ channels: [] }); // Return empty array if no integration
    }
    
    // Decrypt bot token
    const credentials = decryptCredentials(integration.bot_token_encrypted);
    const botToken = credentials.bot_token as string;
    
    // Fetch channels from Slack API
    const slackResponse = await fetch('https://slack.com/api/conversations.list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200,
      }),
    });
    
    const slackData = await slackResponse.json();
    
    if (!slackData.ok) {
      logger.error('Failed to fetch Slack channels', { error: slackData.error });
      return successResponse({ channels: [] }); // Return empty array on error
    }
    
    // Map Slack channels to our format
    const channels = (slackData.channels || []).map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      is_private: channel.is_private,
    }));
    
    return successResponse({ channels });
  } catch (error) {
    logger.error('Error fetching Slack channels:', error);
    return successResponse({ channels: [] }); // Return empty array on error
  }
}

