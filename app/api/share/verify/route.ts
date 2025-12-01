import { NextRequest } from 'next/server';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/share/verify
 * Verify password for a password-protected share link
 * Note: This endpoint does NOT require authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    logger.api('/api/share/verify', 'POST', { token: token?.substring(0, 8) + '...' });

    if (!token || !password) {
      return badRequestResponse('Token and password are required');
    }

    const supabase = createServerAdminClient();

    // Get share link
    const { data: shareLink, error: shareError } = await supabase
      .from('public_share_links')
      .select(`
        id,
        password_hash,
        expires_at,
        permissions,
        use_count,
        asset_id
      `)
      .eq('token', token)
      .single();

    if (shareError || !shareLink) {
      return notFoundResponse('Share link not found');
    }

    // Check if expired
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return errorResponse(new Error('Share link has expired'), 'Share link has expired', 410);
    }

    // Verify password
    if (!shareLink.password_hash) {
      return badRequestResponse('This link is not password protected');
    }

    const isValid = await bcrypt.compare(password, shareLink.password_hash);
    if (!isValid) {
      return errorResponse(new Error('Invalid password'), 'Invalid password', 401);
    }

    // Get mockup data
    const { data: mockup, error: mockupError } = await supabase
      .from('assets')
      .select(`
        id,
        mockup_name,
        mockup_image_url,
        created_at,
        updated_at
      `)
      .eq('id', shareLink.asset_id)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('CardMock not found');
    }

    // Update view count
    await supabase
      .from('public_share_links')
      .update({
        use_count: (shareLink.use_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', shareLink.id);

    return successResponse({
      mockup,
      canDownload: shareLink.permissions === 'view',
    });
  } catch (error) {
    return errorResponse(error, 'Failed to verify share link');
  }
}
