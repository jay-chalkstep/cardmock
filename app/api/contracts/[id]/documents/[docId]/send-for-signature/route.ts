import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

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

    // TODO: Implement DocuSign integration
    // For now, return a placeholder response
    // This would:
    // 1. Convert Word document to PDF (if needed)
    // 2. Create DocuSign envelope
    // 3. Add signer
    // 4. Set signing tabs
    // 5. Send envelope
    // 6. Store envelope_id in contract_documents table

    const placeholderEnvelopeId = `placeholder-${Date.now()}`;

    // Update document with DocuSign status
    const { data: updatedDoc, error: updateError } = await supabaseServer
      .from('contract_documents')
      .update({
        docu_sign_envelope_id: placeholderEnvelopeId,
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

    return successResponse({ 
      document: updatedDoc,
      envelope_id: placeholderEnvelopeId,
      note: 'DocuSign integration not yet implemented. This is a placeholder.'
    });
  } catch (error) {
    return errorResponse(error, 'Failed to send document for signature');
  }
}

