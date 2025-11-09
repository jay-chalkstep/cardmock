/**
 * POST /api/integrations/slack/interactive
 * Handle Slack interactive components (buttons, modals)
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api/response';
import { verifySlackSignature } from '@/lib/integrations/webhooks';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/slack/interactive
 * Handle Slack interactive components
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-slack-signature') || '';
    const timestamp = request.headers.get('x-slack-request-timestamp') || '';
    
    // Verify webhook signature
    if (!verifySlackSignature(body, signature, timestamp)) {
      logger.warn('Invalid Slack interactive signature');
      return unauthorizedResponse('Invalid signature');
    }
    
    const formData = new URLSearchParams(body);
    const payloadStr = formData.get('payload');
    
    if (!payloadStr) {
      return errorResponse(new Error('Missing payload'), 'Missing payload');
    }
    
    const payload = JSON.parse(payloadStr);
    const action = payload.actions?.[0];
    const callbackId = payload.callback_id;
    
    logger.info('Slack interactive component received', { callbackId, actionType: action?.type });
    
    // Handle button actions
    if (action?.type === 'button') {
      const actionValue = action.value;
      const assetId = actionValue?.assetId;
      const actionType = actionValue?.action; // 'approve', 'reject', 'view'
      
      if (actionType === 'approve') {
        // TODO: Create approval via API
        return successResponse({
          response_type: 'ephemeral',
          text: 'Approval recorded. Thank you!',
          replace_original: true,
        });
      } else if (actionType === 'reject') {
        // TODO: Create rejection via API
        return successResponse({
          response_type: 'ephemeral',
          text: 'Changes requested. Thank you for your feedback!',
          replace_original: true,
        });
      } else if (actionType === 'view') {
        // Return link to view in Aiproval
        const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/mockups/${assetId}`;
        return successResponse({
          response_type: 'ephemeral',
          text: `View in Aiproval: ${viewUrl}`,
        });
      }
    }
    
    return successResponse({ received: true });
  } catch (error) {
    logger.error('Slack interactive component error', error);
    return errorResponse(error, 'Failed to process Slack interactive component');
  }
}

