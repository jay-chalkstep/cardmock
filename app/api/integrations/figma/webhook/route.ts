/**
 * POST /api/integrations/figma/webhook
 * Handle Figma webhooks (if available)
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api/response';
import { verifyFigmaSignature } from '@/lib/integrations/webhooks';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { recordIntegrationEvent } from '@/lib/integrations/status';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/figma/webhook
 * Handle Figma webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-figma-signature') || '';
    
    // Verify webhook signature
    if (!verifyFigmaSignature(body, signature)) {
      logger.warn('Invalid Figma webhook signature');
      return unauthorizedResponse('Invalid signature');
    }
    
    const payload = JSON.parse(body);
    const eventType = payload.event_type || payload.type;
    
    logger.info('Figma webhook received', { eventType, payload });
    
    // Handle different event types
    switch (eventType) {
      case 'file_update':
        // Handle file update - check if we have assets synced with this file
        const fileId = payload.file_key || payload.file_id;
        if (fileId) {
          // Find assets with this Figma file ID
          const { data: assets } = await supabaseServer
            .from('assets')
            .select('id, organization_id')
            .eq('figma_metadata->>figma_file_id', fileId);
          
          if (assets && assets.length > 0) {
            // Record event for each asset
            for (const asset of assets) {
              await recordIntegrationEvent(
                'figma',
                asset.organization_id,
                'file_update',
                { assetId: asset.id, fileId },
                'success'
              );
            }
          }
        }
        break;
      
      case 'comment':
        // Handle comment events
        await recordIntegrationEvent(
          'figma',
          'unknown', // Would need to determine org from file
          'comment',
          payload,
          'success'
        );
        break;
      
      default:
        logger.warn('Unknown Figma webhook event type', { eventType });
    }
    
    return successResponse({ received: true });
  } catch (error) {
    logger.error('Figma webhook error', error);
    return errorResponse(error, 'Failed to process Figma webhook');
  }
}

