import { NextRequest } from 'next/server';
import { getAuthContext, requireInternalUser } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/email-mockups/[id]/request-approval
 *
 * Request approval for an email mockup
 * Only internal users (admin/member) can request approval
 * Changes status from 'draft' to 'pending_approval'
 *
 * Body:
 * {
 *   message?: string (optional message to client)
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    // Only internal users can request approval
    const internalCheck = await requireInternalUser();
    if (internalCheck instanceof Response) return internalCheck;
    
    const { id } = await context.params;
    const body = await request.json();
    const { message } = body;

    logger.api(`/api/email-mockups/${id}/request-approval`, 'POST', { orgId, userId });

    // Get email mockup with contract and client
    const { data: mockup, error: mockupError } = await supabaseServer
      .from('email_mockups')
      .select('*, contract:contracts(*, client:clients(*))')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Email mockup not found');
    }

    // Check if mockup is in draft status
    if (mockup.status !== 'draft') {
      return badRequestResponse(`Email mockup cannot be sent for approval. Current status: ${mockup.status}`);
    }

    // Verify email mockup is linked to a contract
    if (!mockup.contract_id) {
      return badRequestResponse('Email mockup must be linked to a contract before requesting approval');
    }

    // Update email mockup status to pending_approval
    const { data: updatedMockup, error: updateError } = await supabaseServer
      .from('email_mockups')
      .update({
        status: 'pending_approval',
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Email mockup approval requested', { 
      mockupId: id, 
      userId,
      contractId: mockup.contract_id 
    });

    // TODO: Send notification to client users
    // TODO: Send email notification to client contacts

    return successResponse({ 
      mockup: updatedMockup,
      message: 'Approval requested successfully'
    });
  } catch (error) {
    logger.error('Error requesting email mockup approval', error);
    return errorResponse(error, 'Failed to request approval');
  }
}

