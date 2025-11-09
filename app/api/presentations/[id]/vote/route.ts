/**
 * POST /api/presentations/[id]/vote
 * Submit a vote in a presentation session
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/presentations/[id]/vote
 * Submit a vote for an asset in a presentation session
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
    const { assetId, voteType, participantName } = body;
    
    if (!assetId || !voteType || !participantName) {
      return badRequestResponse('Asset ID, vote type, and participant name are required');
    }
    
    if (!['approve', 'reject', 'prefer'].includes(voteType)) {
      return badRequestResponse('Invalid vote type. Must be approve, reject, or prefer');
    }
    
    logger.api(`/api/presentations/${id}/vote`, 'POST', { userId, orgId, assetId, voteType });
    
    // Verify session exists
    const { data: session, error: sessionError } = await supabaseServer
      .from('presentation_sessions')
      .select('id, asset_ids')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();
    
    if (sessionError || !session) {
      return notFoundResponse('Presentation session not found');
    }
    
    // Verify asset is in session
    if (!session.asset_ids.includes(assetId)) {
      return badRequestResponse('Asset is not part of this presentation session');
    }
    
    // Get or create participant
    let participantId: string;
    const { data: existingParticipant } = await supabaseServer
      .from('presentation_participants')
      .select('id')
      .eq('session_id', id)
      .eq('user_id', userId)
      .single();
    
    if (existingParticipant) {
      participantId = existingParticipant.id;
    } else {
      const { data: newParticipant, error: participantError } = await supabaseServer
        .from('presentation_participants')
        .insert({
          session_id: id,
          user_id: userId,
          user_name: participantName,
        })
        .select()
        .single();
      
      if (participantError || !newParticipant) {
        return errorResponse(participantError, 'Failed to create participant');
      }
      
      participantId = newParticipant.id;
    }
    
    // Upsert vote
    const { data: vote, error: voteError } = await supabaseServer
      .from('presentation_votes')
      .upsert({
        session_id: id,
        asset_id: assetId,
        participant_id: participantId,
        vote_type: voteType,
      }, {
        onConflict: 'session_id,asset_id,participant_id',
      })
      .select()
      .single();
    
    if (voteError) {
      return errorResponse(voteError, 'Failed to submit vote');
    }
    
    logger.info('Presentation vote submitted', { sessionId: id, assetId, voteType, userId });
    
    return successResponse({ vote }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to submit vote');
  }
}

