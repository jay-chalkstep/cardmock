/**
 * POST /api/public/share/[token]/comment
 * Create a comment on an asset via public share link
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, badRequestResponse, unauthorizedResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyShareToken } from '@/lib/public/jwt';
import { getPublicSession } from '@/lib/public/session';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/public/share/[token]/comment
 * Create a comment (requires identity if identity_required_level is 'comment' or 'approve')
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const { commentText, annotationData, positionX, positionY, annotationType, annotationColor } = body;
    
    if (!commentText || !commentText.trim()) {
      return badRequestResponse('Comment text is required');
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
    if (!['comment', 'approve'].includes(shareLink.permissions)) {
      return unauthorizedResponse('This share link does not allow commenting');
    }
    
    // Check identity requirement
    if (['comment', 'approve'].includes(shareLink.identity_required_level)) {
      const session = await getPublicSession();
      if (!session || !session.email || !session.name) {
        return unauthorizedResponse('Identity required for commenting. Please provide your name and email.');
      }
      
      // Create comment with reviewer identity
      const { data: comment, error: commentError } = await supabaseServer
        .from('mockup_comments')
        .insert({
          mockup_id: shareLink.asset_id,
          organization_id: shareLink.organization_id,
          user_id: `public_${session.id}`, // Use public reviewer ID
          user_name: session.name,
          user_email: session.email,
          comment_text: commentText,
          annotation_data: annotationData || null,
          position_x: positionX || null,
          position_y: positionY || null,
          annotation_type: annotationType || 'none',
          annotation_color: annotationColor || '#10b981',
        })
        .select()
        .single();
      
      if (commentError) {
        return errorResponse(commentError, 'Failed to create comment');
      }
      
      // Record analytics
      await supabaseServer
        .from('public_share_analytics')
        .insert({
          link_id: shareLink.id,
          actions_taken: ['comment'],
        });
      
      logger.info('Public comment created', { token: token.substring(0, 20), commentId: comment.id });
      
      return successResponse({ comment }, 201);
    }
    
    // No identity required - create anonymous comment
    const { data: comment, error: commentError } = await supabaseServer
      .from('mockup_comments')
      .insert({
        mockup_id: shareLink.asset_id,
        organization_id: shareLink.organization_id,
        user_id: 'public_anonymous',
        user_name: 'Anonymous Reviewer',
        comment_text: commentText,
        annotation_data: annotationData || null,
        position_x: positionX || null,
        position_y: positionY || null,
        annotation_type: annotationType || 'none',
        annotation_color: annotationColor || '#10b981',
      })
      .select()
      .single();
    
    if (commentError) {
      return errorResponse(commentError, 'Failed to create comment');
    }
    
    // Record analytics
    await supabaseServer
      .from('public_share_analytics')
      .insert({
        link_id: shareLink.id,
        actions_taken: ['comment'],
      });
    
    logger.info('Public anonymous comment created', { token: token.substring(0, 20), commentId: comment.id });
    
    return successResponse({ comment }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create comment');
  }
}

