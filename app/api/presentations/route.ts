/**
 * POST /api/presentations - Create presentation session
 * GET /api/presentations - List presentation sessions
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/presentations
 * Create a new presentation session
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const body = await request.json();
    const { name, assetIds, presentationMode = 'side_by_side', presenterNotes } = body;
    
    if (!name || !assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return badRequestResponse('Name and assetIds array are required');
    }
    
    if (!['side_by_side', 'overlay', 'timeline', 'grid'].includes(presentationMode)) {
      return badRequestResponse('Invalid presentation mode');
    }
    
    logger.api('/api/presentations', 'POST', { userId, orgId, assetCount: assetIds.length });
    
    const { data: session, error: createError } = await supabaseServer
      .from('presentation_sessions')
      .insert({
        organization_id: orgId,
        created_by: userId,
        name,
        asset_ids: assetIds,
        presentation_mode: presentationMode,
        presenter_notes: presenterNotes || null,
      })
      .select()
      .single();
    
    if (createError) {
      return errorResponse(createError, 'Failed to create presentation session');
    }
    
    logger.info('Presentation session created', { sessionId: session.id, userId, orgId });
    
    return successResponse({ session }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create presentation session');
  }
}

/**
 * GET /api/presentations
 * List presentation sessions for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    logger.api('/api/presentations', 'GET', { orgId });
    
    const { data: sessions, error: fetchError } = await supabaseServer
      .from('presentation_sessions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      return errorResponse(fetchError, 'Failed to fetch presentation sessions');
    }
    
    return successResponse({ sessions: sessions || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch presentation sessions');
  }
}

