/**
 * POST /api/public/share/[token]/approve
 * Approve or reject an asset via public share link
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, badRequestResponse, unauthorizedResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyShareToken } from '@/lib/public/jwt';
import { getPublicSession } from '@/lib/public/session';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/public/share/[token]/approve
 * Approve or reject (requires identity if identity_required_level is 'approve')
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const { status, notes } = body; // status: 'approved' | 'changes_requested'
    
    if (!status || !['approved', 'changes_requested'].includes(status)) {
      return badRequestResponse('Status must be approved or changes_requested');
    }
    
    // Verify token
    const tokenPayload = verifyShareToken(token);
    if (!tokenPayload) {
      return unauthorizedResponse('Invalid or expired share token');
    }
    
    // Get share link
    const { data: shareLink, error: linkError } = await supabaseServer
      .from('public_share_links')
      .select('id, asset_id, organization_id, permissions, identity_required_level')
      .eq('token', token)
      .single();
    
    if (linkError || !shareLink) {
      return unauthorizedResponse('Share link not found');
    }
    
    // Check permissions
    if (shareLink.permissions !== 'approve') {
      return unauthorizedResponse('This share link does not allow approval');
    }
    
    // Identity is always required for approval
    const session = await getPublicSession();
    if (!session || !session.email || !session.name) {
      return unauthorizedResponse('Identity required for approval. Please provide your name and email.');
    }
    
    // Create reviewer record if it doesn't exist
    let reviewerId = session.id;
    
    // Create approval record (using mockup_reviewers table pattern)
    const { data: reviewer, error: reviewerError } = await supabaseServer
      .from('mockup_reviewers')
      .insert({
        mockup_id: shareLink.asset_id,
        organization_id: shareLink.organization_id,
        reviewer_id: `public_${session.id}`,
        reviewer_name: session.name,
        reviewer_email: session.email,
        status: status === 'approved' ? 'approved' : 'changes_requested',
        response_note: notes || null,
        invited_by: 'public_share',
        responded_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (reviewerError) {
      // If reviewer already exists, update instead
      const { data: existingReviewer, error: updateError } = await supabaseServer
        .from('mockup_reviewers')
        .update({
          status: status === 'approved' ? 'approved' : 'changes_requested',
          response_note: notes || null,
          responded_at: new Date().toISOString(),
        })
        .eq('mockup_id', shareLink.asset_id)
        .eq('reviewer_id', `public_${session.id}`)
        .select()
        .single();
      
      if (updateError) {
        return errorResponse(updateError, 'Failed to update approval');
      }
      
      // Record analytics
      await supabaseServer
        .from('public_share_analytics')
        .insert({
          link_id: shareLink.id,
          actions_taken: ['approve'],
        });
      
      logger.info('Public approval updated', { token: token.substring(0, 20), reviewerId: existingReviewer.id });
      
      return successResponse({ reviewer: existingReviewer });
    }
    
    // Record analytics
    await supabaseServer
      .from('public_share_analytics')
      .insert({
        link_id: shareLink.id,
        actions_taken: ['approve'],
      });
    
    logger.info('Public approval created', { token: token.substring(0, 20), reviewerId: reviewer.id });
    
    return successResponse({ reviewer }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create approval');
  }
}

