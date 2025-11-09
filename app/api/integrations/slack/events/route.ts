/**
 * POST /api/integrations/slack/events
 * Handle Slack Events API
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api/response';
import { verifySlackSignature } from '@/lib/integrations/webhooks';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/slack/events
 * Handle Slack Events API webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-slack-signature') || '';
    const timestamp = request.headers.get('x-slack-request-timestamp') || '';
    
    // Verify webhook signature
    if (!verifySlackSignature(body, signature, timestamp)) {
      logger.warn('Invalid Slack webhook signature');
      return unauthorizedResponse('Invalid signature');
    }
    
    const payload = JSON.parse(body);
    
    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      return successResponse({ challenge: payload.challenge });
    }
    
    // Handle event callbacks
    if (payload.type === 'event_callback') {
      const event = payload.event;
      
      logger.info('Slack event received', { eventType: event.type, event });
      
      // Handle different event types
      switch (event.type) {
        case 'app_mention':
          // Handle app mentions
          break;
        case 'message':
          // Handle messages (if needed)
          break;
        default:
          logger.debug('Unhandled Slack event type', { eventType: event.type });
      }
    }
    
    return successResponse({ received: true });
  } catch (error) {
    logger.error('Slack events webhook error', error);
    return errorResponse(error, 'Failed to process Slack event');
  }
}

