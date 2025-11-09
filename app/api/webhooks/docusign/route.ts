import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/docusign
 *
 * Handle DocuSign webhook events
 *
 * This endpoint receives webhook notifications from DocuSign
 * when envelope status changes (sent, delivered, signed, declined, voided)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    logger.api('/api/webhooks/docusign', 'POST', { event });

    // TODO: Verify webhook signature from DocuSign
    // TODO: Handle different event types
    // - envelope-sent
    // - envelope-delivered
    // - envelope-signed
    // - envelope-declined
    // - envelope-voided

    // For now, log the event
    logger.info('DocuSign webhook received:', { event, data });

    // Example: Update document status based on envelope status
    if (data?.envelope_id) {
      // Find document by envelope_id
      const { data: document } = await supabaseServer
        .from('contract_documents')
        .select('id, contract_id')
        .eq('docu_sign_envelope_id', data.envelope_id)
        .single();

      if (document) {
        // Update document status
        await supabaseServer
          .from('contract_documents')
          .update({
            docu_sign_status: event === 'envelope-signed' ? 'signed' : 
                             event === 'envelope-declined' ? 'declined' :
                             event === 'envelope-voided' ? 'voided' :
                             event === 'envelope-delivered' ? 'delivered' : 'sent',
          })
          .eq('id', document.id);

        // Update contract status if signed
        if (event === 'envelope-signed') {
          await supabaseServer
            .from('contracts')
            .update({ status: 'signed' })
            .eq('id', document.contract_id);
        }
      }
    }

    return successResponse({ message: 'Webhook processed' });
  } catch (error) {
    logger.error('DocuSign webhook error:', error);
    return errorResponse(error, 'Failed to process webhook');
  }
}

