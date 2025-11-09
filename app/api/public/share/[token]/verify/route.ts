/**
 * POST /api/public/share/[token]/verify
 * Verify password for password-protected share links
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, badRequestResponse, unauthorizedResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyPassword } from '@/lib/integrations/encryption';
import { verifyShareToken } from '@/lib/public/jwt';

export const dynamic = 'force-dynamic';

/**
 * POST /api/public/share/[token]/verify
 * Verify password for password-protected share link
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const { password } = body;
    
    if (!password) {
      return badRequestResponse('Password is required');
    }
    
    // Verify token
    const tokenPayload = verifyShareToken(token);
    if (!tokenPayload) {
      return unauthorizedResponse('Invalid or expired share token');
    }
    
    // Get share link
    const { data: shareLink, error: linkError } = await supabaseServer
      .from('public_share_links')
      .select('id, password_hash')
      .eq('token', token)
      .single();
    
    if (linkError || !shareLink) {
      return unauthorizedResponse('Share link not found');
    }
    
    if (!shareLink.password_hash) {
      return successResponse({ verified: true });
    }
    
    // Verify password
    const isValid = await verifyPassword(password, shareLink.password_hash);
    
    if (!isValid) {
      return unauthorizedResponse('Invalid password');
    }
    
    return successResponse({ verified: true });
  } catch (error) {
    return errorResponse(error, 'Failed to verify password');
  }
}

