/**
 * GET /api/public/share/[token]
 * Get public share link data and asset information
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { verifyShareToken } from '@/lib/public/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/share/[token]
 * Get public share link data
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    
    // Verify token
    const tokenPayload = verifyShareToken(token);
    if (!tokenPayload) {
      return unauthorizedResponse('Invalid or expired share token');
    }
    
    // Get share link from database
    const { data: shareLink, error: linkError } = await supabaseServer
      .from('public_share_links')
      .select('*, asset:assets(*)')
      .eq('token', token)
      .single();
    
    if (linkError || !shareLink) {
      return notFoundResponse('Share link not found');
    }
    
    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return unauthorizedResponse('Share link has expired');
    }
    
    // Check max uses
    if (shareLink.max_uses && shareLink.use_count >= shareLink.max_uses) {
      return unauthorizedResponse('Share link has reached maximum uses');
    }
    
    // Increment use count
    await supabaseServer
      .from('public_share_links')
      .update({ use_count: shareLink.use_count + 1 })
      .eq('id', shareLink.id);
    
    // Record analytics
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    await supabaseServer
      .from('public_share_analytics')
      .insert({
        link_id: shareLink.id,
        viewer_ip: clientIp,
        user_agent: userAgent,
        actions_taken: ['view'],
      });
    
    logger.info('Public share link accessed', { token: token.substring(0, 20), linkId: shareLink.id });
    
    // Return share link data (without sensitive info)
    return successResponse({
      shareLink: {
        id: shareLink.id,
        assetId: shareLink.asset_id,
        permissions: shareLink.permissions,
        identityRequiredLevel: shareLink.identity_required_level,
        hasPassword: !!shareLink.password_hash,
        expiresAt: shareLink.expires_at,
        maxUses: shareLink.max_uses,
        useCount: shareLink.use_count + 1,
      },
      asset: shareLink.asset ? {
        id: shareLink.asset.id,
        mockup_name: shareLink.asset.mockup_name,
        mockup_image_url: shareLink.asset.mockup_image_url,
        created_at: shareLink.asset.created_at,
      } : null,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to get share link data');
  }
}

