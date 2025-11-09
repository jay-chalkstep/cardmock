/**
 * GET /api/presentations/[id] - Get presentation session details
 * DELETE /api/presentations/[id] - Delete presentation session
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/presentations/[id]
 * Get presentation session details
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;
    
    logger.api(`/api/presentations/${id}`, 'GET', { orgId });
    
    const { data: session, error: fetchError } = await supabaseServer
      .from('presentation_sessions')
      .select('*, participants:presentation_participants(*), votes:presentation_votes(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();
    
    if (fetchError || !session) {
      return notFoundResponse('Presentation session not found');
    }
    
    return successResponse({ session });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch presentation session');
  }
}

/**
 * DELETE /api/presentations/[id]
 * Delete presentation session
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;
    
    logger.api(`/api/presentations/${id}`, 'DELETE', { userId, orgId });
    
    // Verify session exists and user has permission
    const { data: session, error: fetchError } = await supabaseServer
      .from('presentation_sessions')
      .select('id, created_by')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();
    
    if (fetchError || !session) {
      return notFoundResponse('Presentation session not found');
    }
    
    // Only creator can delete
    if (session.created_by !== userId) {
      return forbiddenResponse('Only the creator can delete this presentation session');
    }
    
    const { error: deleteError } = await supabaseServer
      .from('presentation_sessions')
      .update({ is_active: false })
      .eq('id', id);
    
    if (deleteError) {
      return errorResponse(deleteError, 'Failed to delete presentation session');
    }
    
    logger.info('Presentation session deleted', { sessionId: id, userId, orgId });
    
    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to delete presentation session');
  }
}

