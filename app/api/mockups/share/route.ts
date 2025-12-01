import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { sendEmail } from '@/lib/email/resend';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mockups/share
 * Create a share link and optionally send email invitations
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId, user } = authResult;

    const supabase = createServerAdminClient();
    const body = await request.json();
    const { mockupId, emails, message, includeDownload, expiresAt, password } = body;

    logger.api('/api/mockups/share', 'POST', { orgId, userId, mockupId });

    if (!mockupId) {
      return badRequestResponse('mockupId is required');
    }

    // Verify mockup exists and belongs to org
    const { data: mockup, error: mockupError } = await supabase
      .from('assets')
      .select('id, mockup_name, mockup_image_url, organization_id')
      .eq('id', mockupId)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    // Generate share token
    const token = nanoid(24);

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Create share link record
    const { data: shareLink, error: shareError } = await supabase
      .from('public_share_links')
      .insert({
        asset_id: mockupId,
        organization_id: orgId,
        token,
        expires_at: expiresAt || null,
        password_hash: passwordHash,
        permissions: includeDownload ? 'view' : 'view', // Can extend to 'comment', 'approve'
        created_by: userId,
      })
      .select()
      .single();

    if (shareError) {
      return handleSupabaseError(shareError);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cardmock.app';
    const shareUrl = `${baseUrl}/share/${token}`;

    // Send emails if recipients provided
    const emailList = Array.isArray(emails) ? emails : [];
    if (emailList.length > 0) {
      const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'Someone';

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">${userName} shared a CardMock with you</h2>

          ${mockup.mockup_image_url ? `
            <div style="margin: 24px 0;">
              <img src="${mockup.mockup_image_url}" alt="${mockup.mockup_name}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            </div>
          ` : ''}

          <p style="color: #333; font-size: 16px;"><strong>${mockup.mockup_name}</strong></p>

          ${message ? `
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="color: #666; margin: 0;">${message}</p>
            </div>
          ` : ''}

          <a href="${shareUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">
            View CardMock
          </a>

          ${includeDownload ? `
            <p style="color: #666; font-size: 14px;">You can also download this design from the link above.</p>
          ` : ''}

          ${expiresAt ? `
            <p style="color: #999; font-size: 12px;">This link expires on ${new Date(expiresAt).toLocaleDateString()}.</p>
          ` : ''}
        </div>
      `;

      try {
        await sendEmail({
          to: emailList,
          subject: `${userName} shared "${mockup.mockup_name}" with you`,
          html: htmlContent,
        });

        logger.info('Share emails sent successfully', { mockupId, recipientCount: emailList.length });
      } catch (emailError) {
        logger.error('Failed to send share emails', emailError as Error, { mockupId });
        // Don't fail the whole request if email fails
      }
    }

    // Log activity (fire and forget)
    supabase.from('cardmock_activity').insert({
      cardmock_id: mockupId,
      action: 'shared',
      actor_id: userId,
      metadata: {
        share_link_id: shareLink.id,
        recipient_count: emailList.length,
        include_download: includeDownload,
      },
    }).then(() => {}, () => {});

    return successResponse({
      shareLink: shareUrl,
      shareLinkId: shareLink.id,
      token,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to create share link');
  }
}
