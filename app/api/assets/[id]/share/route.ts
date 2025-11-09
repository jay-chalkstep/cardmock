/**
 * API routes for managing public share links for assets
 * POST: Generate a new public share link
 * DELETE: Revoke a public share link
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { generateShareToken } from '@/lib/public/jwt';
import { hashPassword } from '@/lib/integrations/encryption';

export const dynamic = 'force-dynamic';

/**
 * POST /api/assets/[id]/share
 * Generate a new public share link for an asset
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
    const {
      permissions = 'view',
      expiresInDays = 7,
      password,
      maxUses,
      identityRequiredLevel = 'none',
    } = body;
    
    // Validate permissions
    if (!['view', 'comment', 'approve'].includes(permissions)) {
      return badRequestResponse('Invalid permissions. Must be view, comment, or approve');
    }
    
    // Validate identity required level
    if (!['none', 'comment', 'approve'].includes(identityRequiredLevel)) {
      return badRequestResponse('Invalid identity_required_level. Must be none, comment, or approve');
    }
    
    // Verify asset exists and belongs to organization
    const { data: asset, error: assetError } = await supabaseServer
      .from('assets')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();
    
    if (assetError || !asset) {
      return notFoundResponse('Asset not found');
    }
    
    // Check if link already exists
    const { data: existingLink } = await supabaseServer
      .from('public_share_links')
      .select('id')
      .eq('asset_id', id)
      .eq('organization_id', orgId)
      .single();
    
    if (existingLink) {
      return badRequestResponse('A public share link already exists for this asset. Delete it first to create a new one.');
    }
    
    // Generate token
    const token = generateShareToken(id, orgId, permissions, crypto.randomUUID(), expiresInDays);
    
    // Calculate expiration date
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;
    
    // Hash password if provided
    const passwordHash = password ? await hashPassword(password) : null;
    
    // Create share link
    const { data: shareLink, error: createError } = await supabaseServer
      .from('public_share_links')
      .insert({
        asset_id: id,
        organization_id: orgId,
        token,
        expires_at: expiresAt,
        password_hash: passwordHash,
        permissions,
        max_uses: maxUses,
        created_by: userId,
        identity_required_level: identityRequiredLevel,
      })
      .select()
      .single();
    
    if (createError) {
      return handleSupabaseError(createError);
    }
    
    // Update asset to mark as shareable
    await supabaseServer
      .from('assets')
      .update({ public_share_enabled: true })
      .eq('id', id);
    
    logger.info('Public share link created', { assetId: id, linkId: shareLink.id, userId, orgId });
    
    return successResponse({
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        expiresAt: shareLink.expires_at,
        permissions: shareLink.permissions,
        maxUses: shareLink.max_uses,
        useCount: shareLink.use_count,
        identityRequiredLevel: shareLink.identity_required_level,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareLink.token}`,
      },
    }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create public share link');
  }
}

/**
 * DELETE /api/assets/[id]/share
 * Revoke a public share link for an asset
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
    
    // Verify asset exists and belongs to organization
    const { data: asset, error: assetError } = await supabaseServer
      .from('assets')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();
    
    if (assetError || !asset) {
      return notFoundResponse('Asset not found');
    }
    
    // Find and delete share link
    const { data: shareLink, error: findError } = await supabaseServer
      .from('public_share_links')
      .select('id')
      .eq('asset_id', id)
      .eq('organization_id', orgId)
      .single();
    
    if (findError || !shareLink) {
      return notFoundResponse('Public share link not found');
    }
    
    const { error: deleteError } = await supabaseServer
      .from('public_share_links')
      .delete()
      .eq('id', shareLink.id);
    
    if (deleteError) {
      return handleSupabaseError(deleteError);
    }
    
    // Update asset to mark as not shareable
    await supabaseServer
      .from('assets')
      .update({ public_share_enabled: false })
      .eq('id', id);
    
    logger.info('Public share link revoked', { assetId: id, linkId: shareLink.id, userId, orgId });
    
    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(error, 'Failed to revoke public share link');
  }
}

