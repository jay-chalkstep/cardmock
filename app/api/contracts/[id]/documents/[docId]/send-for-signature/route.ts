import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { createEnvelope } from '@/lib/docusign/envelopes';
import { createServerAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contracts/[id]/documents/[docId]/send-for-signature
 *
 * Send document to DocuSign for signature
 *
 * Body:
 * {
 *   signer_email: string (required),
 *   signer_name: string (required),
 *   subject?: string (optional),
 *   message?: string (optional)
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id, docId } = await context.params;
    const body = await request.json();
    const { signer_email, signer_name, subject, message } = body;

    logger.api(`/api/contracts/${id}/documents/${docId}/send-for-signature`, 'POST', { orgId });

    // Check if contract exists
    const { data: contract } = await supabaseServer
      .from('contracts')
      .select('id, contract_number')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!contract) {
      return notFoundResponse('Contract not found');
    }

    // Get document
    const { data: document } = await supabaseServer
      .from('contract_documents')
      .select('*')
      .eq('id', docId)
      .eq('contract_id', id)
      .single();

    if (!document) {
      return notFoundResponse('Document not found');
    }

    // Validate required fields
    if (!signer_email || !signer_name) {
      return badRequestResponse('Signer email and name are required');
    }

    try {
      // Check if DocuSign is configured
      if (!process.env.DOCUSIGN_INTEGRATION_KEY || !process.env.DOCUSIGN_USER_ID || 
          !process.env.DOCUSIGN_ACCOUNT_ID || !process.env.DOCUSIGN_RSA_PRIVATE_KEY) {
        return errorResponse(
          new Error('DocuSign is not configured. Please set up DocuSign environment variables.'),
          'DocuSign integration is not configured'
        );
      }

      // Download document from storage
      const supabaseAdmin = createServerAdminClient();
      const fileUrl = document.file_url;
      
      // Extract file path from URL
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      const filePath = `contract-documents/${id}/${fileName}`;

      // Download file
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('contract-documents')
        .download(filePath);

      if (downloadError || !fileData) {
        logger.error('Failed to download document for DocuSign', downloadError);
        return errorResponse(
          new Error('Failed to download document'),
          'Could not download document for signing'
        );
      }

      // Convert Word document to PDF
      // Note: For production, you may want to use a cloud service like CloudConvert
      // or a library like docx-pdf. For now, we'll assume the document is already PDF
      // or use a placeholder conversion
      const arrayBuffer = await fileData.arrayBuffer();
      let pdfBase64: string;

      // Check if document is already PDF
      if (document.mime_type === 'application/pdf' || document.file_name.endsWith('.pdf')) {
        pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
      } else {
        // For Word documents, we need to convert to PDF
        // This is a placeholder - in production, use a proper conversion service
        // For now, we'll return an error suggesting manual conversion
        return errorResponse(
          new Error('Word to PDF conversion not yet implemented'),
          'Please convert the document to PDF before sending for signature, or use a PDF conversion service.'
        );
      }

      // Create DocuSign envelope
      const envelopeId = await createEnvelope({
        documentName: document.file_name.replace(/\.(docx?|pdf)$/i, '.pdf'),
        documentBase64: pdfBase64,
        recipients: [{
          email: signer_email,
          name: signer_name,
          routingOrder: 1,
        }],
        emailSubject: subject || `Please sign: ${contract.contract_number}`,
        emailBlurb: message || `Please review and sign the contract document for ${contract.contract_number}.`,
        status: 'sent',
      });

      // Update document with DocuSign status
      const { data: updatedDoc, error: updateError } = await supabaseServer
        .from('contract_documents')
        .update({
          docu_sign_envelope_id: envelopeId,
          docu_sign_status: 'sent',
        })
        .eq('id', docId)
        .select()
        .single();

      if (updateError) {
        return handleSupabaseError(updateError);
      }

      // Update contract status
      await supabaseServer
        .from('contracts')
        .update({ status: 'pending_signature' })
        .eq('id', id);

      logger.info('Document sent for signature', { contractId: id, docId, envelopeId });

      return successResponse({ 
        document: updatedDoc,
        envelope_id: envelopeId,
      });
    } catch (error: any) {
      logger.error('DocuSign integration error', error);
      
      // Check if it's a DocuSign configuration error
      if (error.message?.includes('configuration') || error.message?.includes('not configured')) {
        return errorResponse(
          error,
          'DocuSign is not properly configured. Please check your environment variables.'
        );
      }

      return errorResponse(
        error,
        error.message || 'Failed to send document for signature'
      );
    }
  } catch (error) {
    return errorResponse(error, 'Failed to send document for signature');
  }
}

