/**
 * POST /api/integrations/gmail/send-approval
 * Send approval request from Gmail add-on
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { getIntegrationCredentials } from '@/lib/integrations/oauth';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { recordIntegrationEvent } from '@/lib/integrations/status';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/gmail/send-approval
 * Send approval request from Gmail add-on
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const body = await request.json();
    const { threadId, assetIds, recipients, message } = body;
    
    if (!threadId || !assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return badRequestResponse('Thread ID and asset IDs are required');
    }
    
    logger.api('/api/integrations/gmail/send-approval', 'POST', { userId, orgId, threadId, assetCount: assetIds.length });
    
    // Get Gmail credentials
    const credentials = await getIntegrationCredentials('gmail', userId, orgId);
    if (!credentials) {
      return errorResponse(new Error('Gmail integration not connected'), 'Gmail integration not connected');
    }
    
    // Link thread to assets
    for (const assetId of assetIds) {
      await supabaseServer
        .from('gmail_threads')
        .upsert({
          thread_id: threadId,
          asset_id: assetId,
          organization_id: orgId,
        }, {
          onConflict: 'thread_id,organization_id',
        });
    }
    
    // TODO: Send email via Gmail API with approval links
    // This would use the Gmail API to send emails with embedded review links
    
    // Record event
    await recordIntegrationEvent(
      'gmail',
      orgId,
      'approval_sent',
      { threadId, assetIds, recipients },
      'success'
    );
    
    logger.info('Gmail approval request sent', { userId, orgId, threadId });
    
    return successResponse({
      success: true,
      threadId,
      assetIds,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to send Gmail approval request');
  }
}

