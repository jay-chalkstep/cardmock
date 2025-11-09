/**
 * POST /api/integrations/slack/notify
 * Send notification to Slack
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { decryptCredentials } from '@/lib/integrations/encryption';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/slack/notify
 * Send notification to Slack channel
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const body = await request.json();
    const { channelId, message, assetId, eventType } = body;
    
    if (!channelId || !message) {
      return badRequestResponse('Channel ID and message are required');
    }
    
    logger.api('/api/integrations/slack/notify', 'POST', { orgId, channelId, eventType });
    
    // Get Slack integration
    const { data: integration, error: fetchError } = await supabaseServer
      .from('slack_integrations')
      .select('*')
      .eq('organization_id', orgId)
      .single();
    
    if (fetchError || !integration) {
      return errorResponse(new Error('Slack integration not found'), 'Slack integration not connected');
    }
    
    // Decrypt bot token
    const credentials = decryptCredentials(integration.bot_token_encrypted);
    const botToken = credentials.bot_token as string;
    
    // Send message to Slack
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: message,
        // TODO: Add Block Kit formatting for rich messages
      }),
    });
    
    const slackData = await slackResponse.json();
    
    if (!slackData.ok) {
      logger.error('Failed to send Slack message', { error: slackData.error });
      return errorResponse(new Error(slackData.error), 'Failed to send Slack notification');
    }
    
    // Record notification event
    await supabaseServer
      .from('slack_notification_events')
      .insert({
        integration_id: integration.id,
        asset_id: assetId || null,
        channel_id: channelId,
        message_ts: slackData.ts,
        event_type: eventType || 'notification',
        status: 'sent',
      });
    
    logger.info('Slack notification sent', { orgId, channelId, messageTs: slackData.ts });
    
    return successResponse({
      success: true,
      messageTs: slackData.ts,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to send Slack notification');
  }
}

