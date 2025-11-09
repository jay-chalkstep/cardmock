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
    
    logger.api('/api/webhooks/docusign', 'POST', { body });

    // TODO: Verify webhook signature from DocuSign
    // DocuSign sends webhooks with HMAC signature in headers
    // const signature = request.headers.get('X-DocuSign-Signature-1');
    // Verify signature using secret key

    // DocuSign webhook format can vary, but typically includes:
    // - data.envelopeId
    // - data.envelopeStatus
    // - data.event
    // - data.recipients (array of recipient statuses)

    const envelopeId = body.data?.envelopeId || body.envelopeId || body.data?.envelope_id;
    const envelopeStatus = body.data?.envelopeStatus || body.status || body.data?.status;
    const event = body.event || body.data?.event || envelopeStatus;

    if (!envelopeId) {
      logger.warn('DocuSign webhook received without envelope ID', { body });
      return successResponse({ message: 'Webhook received but no envelope ID found' });
    }

    logger.info('DocuSign webhook received', { envelopeId, envelopeStatus, event });

    // Find document by envelope_id
    const { data: document, error: docError } = await supabaseServer
      .from('contract_documents')
      .select('id, contract_id, docu_sign_status')
      .eq('docu_sign_envelope_id', envelopeId)
      .single();

    if (docError || !document) {
      logger.warn('Document not found for envelope', { envelopeId, error: docError });
      return successResponse({ message: 'Document not found for envelope' });
    }

    // Map DocuSign status to our status enum
    let docuSignStatus: string;
    switch (envelopeStatus?.toLowerCase()) {
      case 'sent':
        docuSignStatus = 'sent';
        break;
      case 'delivered':
        docuSignStatus = 'delivered';
        break;
      case 'completed':
      case 'signed':
        docuSignStatus = 'signed';
        break;
      case 'declined':
        docuSignStatus = 'declined';
        break;
      case 'voided':
        docuSignStatus = 'voided';
        break;
      default:
        docuSignStatus = envelopeStatus || 'sent';
    }

    // Update document status
    const { error: updateError } = await supabaseServer
      .from('contract_documents')
      .update({
        docu_sign_status: docuSignStatus,
      })
      .eq('id', document.id);

    if (updateError) {
      logger.error('Failed to update document status', updateError);
      return errorResponse(updateError, 'Failed to update document status');
    }

    // Update contract status based on envelope status
    if (docuSignStatus === 'signed' || envelopeStatus?.toLowerCase() === 'completed') {
      await supabaseServer
        .from('contracts')
        .update({ status: 'signed' })
        .eq('id', document.contract_id);
    } else if (docuSignStatus === 'declined') {
      await supabaseServer
        .from('contracts')
        .update({ status: 'draft' })
        .eq('id', document.contract_id);
    } else if (docuSignStatus === 'sent' || docuSignStatus === 'delivered') {
      await supabaseServer
        .from('contracts')
        .update({ status: 'pending_signature' })
        .eq('id', document.contract_id);
    }

    logger.info('DocuSign webhook processed successfully', { 
      envelopeId, 
      docuSignStatus, 
      documentId: document.id 
    });

    return successResponse({ 
      message: 'Webhook processed',
      envelopeId,
      status: docuSignStatus,
    });
  } catch (error) {
    logger.error('DocuSign webhook error:', error);
    return errorResponse(error, 'Failed to process webhook');
  }
}

