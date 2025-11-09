/**
 * POST /api/public/share/[token]/reviewer
 * Capture reviewer identity for progressive identity capture
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, badRequestResponse, unauthorizedResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyShareToken } from '@/lib/public/jwt';
import { getOrCreatePublicSession } from '@/lib/public/session';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/public/share/[token]/reviewer
 * Capture reviewer identity
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const { email, name, company } = body;
    
    // Verify token
    const tokenPayload = verifyShareToken(token);
    if (!tokenPayload) {
      return unauthorizedResponse('Invalid or expired share token');
    }
    
    // Get share link to check identity requirements
    const { data: shareLink, error: linkError } = await supabaseServer
      .from('public_share_links')
      .select('id, identity_required_level')
      .eq('token', token)
      .single();
    
    if (linkError || !shareLink) {
      return unauthorizedResponse('Share link not found');
    }
    
    // Get client IP and user agent
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Create or update public session
    const { sessionToken, reviewerId, isNew } = await getOrCreatePublicSession({
      email,
      name,
      company,
      ipAddress: clientIp,
      userAgent,
    });
    
    // If email provided, mark as verified
    if (email && isNew) {
      await supabaseServer
        .from('public_reviewers')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', reviewerId);
    }
    
    logger.info('Public reviewer identity captured', { token: token.substring(0, 20), reviewerId, email });
    
    return successResponse({
      reviewerId,
      sessionToken,
      verified: !!email,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to capture reviewer identity');
  }
}

