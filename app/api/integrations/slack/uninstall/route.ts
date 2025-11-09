/**
 * POST /api/integrations/slack/uninstall
 * Handle Slack uninstall webhook
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { verifySlackSignature } from '@/lib/integrations/webhooks';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/slack/uninstall
 * Handle Slack uninstall webhook or manual uninstall
 */
export async function POST(request: NextRequest) {
  try {
    // Check if this is a webhook (has signature) or manual uninstall
    const signature = request.headers.get('x-slack-signature');
    const timestamp = request.headers.get('x-slack-request-timestamp');
    
    if (signature && timestamp) {
      // This is a webhook - verify signature
      const body = await request.text();
      
      if (!verifySlackSignature(body, signature, timestamp)) {
        logger.warn('Invalid Slack uninstall webhook signature');
        return errorResponse(new Error('Invalid signature'), 'Invalid signature', 401);
      }
      
      const payload = JSON.parse(body);
      const teamId = payload.team_id;
      
      // Delete integration
      const { error: deleteError } = await supabaseServer
        .from('slack_integrations')
        .delete()
        .eq('workspace_id', teamId);
      
      if (deleteError) {
        logger.error('Failed to delete Slack integration', { error: deleteError, teamId });
        return errorResponse(deleteError, 'Failed to uninstall Slack');
      }
      
      logger.info('Slack integration uninstalled via webhook', { teamId });
      return successResponse({ success: true });
    } else {
      // Manual uninstall - require auth
      const authResult = await getAuthContext();
      if (authResult instanceof Response) return authResult;
      const { orgId } = authResult;
      
      logger.api('/api/integrations/slack/uninstall', 'POST', { orgId });
      
      // Delete integration
      const { error: deleteError } = await supabaseServer
        .from('slack_integrations')
        .delete()
        .eq('organization_id', orgId);
      
      if (deleteError) {
        logger.error('Failed to delete Slack integration', { error: deleteError, orgId });
        return errorResponse(deleteError, 'Failed to uninstall Slack');
      }
      
      logger.info('Slack integration uninstalled', { orgId });
      return successResponse({ success: true });
    }
  } catch (error) {
    return errorResponse(error, 'Failed to uninstall Slack integration');
  }
}

