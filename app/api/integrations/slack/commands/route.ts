/**
 * POST /api/integrations/slack/commands
 * Handle Slack slash commands
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api/response';
import { verifySlackSignature } from '@/lib/integrations/webhooks';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/slack/commands
 * Handle Slack slash commands
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-slack-signature') || '';
    const timestamp = request.headers.get('x-slack-request-timestamp') || '';
    
    // Verify webhook signature
    if (!verifySlackSignature(body, signature, timestamp)) {
      logger.warn('Invalid Slack command signature');
      return unauthorizedResponse('Invalid signature');
    }
    
    const formData = new URLSearchParams(body);
    const command = formData.get('command');
    const text = formData.get('text') || '';
    const userId = formData.get('user_id');
    const teamId = formData.get('team_id');
    const channelId = formData.get('channel_id');
    
    logger.info('Slack command received', { command, text, userId, teamId });
    
    // Get Slack integration
    const { data: integration } = await supabaseServer
      .from('slack_integrations')
      .select('organization_id')
      .eq('workspace_id', teamId)
      .single();
    
    if (!integration) {
      return successResponse({
        response_type: 'ephemeral',
        text: 'Slack integration not found. Please install the CardMock Slack app.',
      });
    }
    
    // Handle different commands
    if (command === '/cardmock') {
      const parts = text.trim().split(' ');
      const subcommand = parts[0];
      
      switch (subcommand) {
        case 'status':
          // Get project status
          const projectName = parts.slice(1).join(' ');
          // TODO: Implement project status lookup
          return successResponse({
            response_type: 'in_channel',
            text: `Status for ${projectName || 'all projects'}: Check CardMock dashboard for details.`,
          });
        
        case 'pending':
          // Get pending approvals
          // TODO: Implement pending approvals lookup
          return successResponse({
            response_type: 'ephemeral',
            text: 'Pending approvals: Check CardMock dashboard for details.',
          });
        
        case 'share':
          // Share mockup for quick feedback
          const mockupId = parts[1];
          if (!mockupId) {
            return successResponse({
              response_type: 'ephemeral',
              text: 'Usage: /cardmock share <mockup_id>',
            });
          }
          // TODO: Implement mockup sharing
          return successResponse({
            response_type: 'in_channel',
            text: `Mockup ${mockupId} shared for feedback.`,
          });
        
        default:
          return successResponse({
            response_type: 'ephemeral',
            text: 'Available commands: status [project], pending, share <mockup_id>',
          });
      }
    }
    
    return successResponse({ received: true });
  } catch (error) {
    logger.error('Slack command error', error);
    return errorResponse(error, 'Failed to process Slack command');
  }
}

