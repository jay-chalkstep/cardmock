import { NextRequest } from 'next/server';
import { getAuthContext, isClient, getUserAssignedClientId } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/email-mockups/[id]/reject
 *
 * Reject an email mockup
 * For Client-role users: Only allows rejection if email mockup belongs to their assigned client
 *
 * Body:
 * {
 *   notes?: string (required - should provide reason for rejection)
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
    
    const { id } = await context.params;
    const body = await request.json();
    const { notes } = body;

    logger.api(`/api/email-mockups/${id}/reject`, 'POST', { orgId, userId });

    // Get email mockup with contract
    const { data: mockup, error: mockupError } = await supabaseServer
      .from('email_mockups')
      .select('*, contract:contracts(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Email mockup not found');
    }

    // For Client-role users: Verify email mockup belongs to their assigned client
    const userIsClient = await isClient();
    if (userIsClient) {
      const assignedClientId = await getUserAssignedClientId();
      if (!assignedClientId) {
        return forbiddenResponse('Client assignment required');
      }
      
      // Check if email mockup's contract belongs to assigned client
      if (mockup.contract_id) {
        const contract = mockup.contract as any;
        if (contract.client_id !== assignedClientId) {
          return forbiddenResponse('Access denied: Email mockup does not belong to your assigned client');
        }
      } else {
        return forbiddenResponse('Email mockup must be linked to a contract');
      }
    }

    // Check if mockup is in pending_approval status
    if (mockup.status !== 'pending_approval') {
      return badRequestResponse(`Email mockup is not pending approval. Current status: ${mockup.status}`);
    }

    // Notes are recommended for rejection
    if (!notes || notes.trim().length === 0) {
      return badRequestResponse('Please provide a reason for rejection');
    }

    // Get user details from Clerk
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const userName = user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Unknown User';

    // Update email mockup status to rejected
    const { data: updatedMockup, error: updateError } = await supabaseServer
      .from('email_mockups')
      .update({
        status: 'rejected',
        // Store rejection notes in metadata or notes field
        // Note: We could create a separate email_mockup_approvals table for full history
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    logger.info('Email mockup rejected', { 
      mockupId: id, 
      userId, 
      userName,
      contractId: mockup.contract_id,
      notes 
    });

    // TODO: Send notification to creator with rejection notes
    // TODO: Create approval history record

    return successResponse({ 
      mockup: updatedMockup,
      message: 'Email mockup rejected'
    });
  } catch (error) {
    logger.error('Error rejecting email mockup', error);
    return errorResponse(error, 'Failed to reject email mockup');
  }
}

