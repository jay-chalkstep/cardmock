/**
 * POST /api/presentations/[id]/join
 * Join a presentation session
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/presentations/[id]/join
 * Join a presentation session as a participant
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
    const { participantName } = body;
    
    if (!participantName) {
      return badRequestResponse('Participant name is required');
    }
    
    logger.api(`/api/presentations/${id}/join`, 'POST', { userId, orgId });
    
    // Verify session exists
    const { data: session, error: sessionError } = await supabaseServer
      .from('presentation_sessions')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .single();
    
    if (sessionError || !session) {
      return notFoundResponse('Presentation session not found or inactive');
    }
    
    // Create or update participant
    const { data: participant, error: participantError } = await supabaseServer
      .from('presentation_participants')
      .upsert({
        session_id: id,
        user_id: userId,
        user_name: participantName,
        last_active_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id,user_id',
      })
      .select()
      .single();
    
    if (participantError) {
      return errorResponse(participantError, 'Failed to join session');
    }
    
    logger.info('Participant joined presentation session', { sessionId: id, participantId: participant.id, userId });
    
    return successResponse({ participant }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to join presentation session');
  }
}

