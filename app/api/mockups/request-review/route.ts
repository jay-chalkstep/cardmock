import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { sendEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mockups/request-review
 * Request a review for a CardMock
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId, user } = authResult;

    const supabase = createServerAdminClient();
    const body = await request.json();
    const { mockupId, reviewerIds, dueDate, message, reviewType } = body;

    logger.api('/api/mockups/request-review', 'POST', { orgId, userId, mockupId });

    if (!mockupId) {
      return badRequestResponse('mockupId is required');
    }

    if (!reviewerIds || reviewerIds.length === 0) {
      return badRequestResponse('At least one reviewer is required');
    }

    // Verify mockup exists and belongs to org
    const { data: mockup, error: mockupError } = await supabase
      .from('assets')
      .select('id, mockup_name, mockup_image_url, organization_id, status')
      .eq('id', mockupId)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    // Get reviewer details from org_memberships
    const { data: reviewers, error: reviewersError } = await supabase
      .from('org_memberships')
      .select('user_id, user_name, user_email, user_image_url')
      .eq('organization_id', orgId)
      .in('user_id', reviewerIds);

    if (reviewersError || !reviewers) {
      return handleSupabaseError(reviewersError || new Error('Failed to fetch reviewers'));
    }

    // Create review request record
    const { data: review, error: reviewError } = await supabase
      .from('cardmock_reviews')
      .insert({
        cardmock_id: mockupId,
        status: 'pending',
        review_type: reviewType || 'all',
        due_date: dueDate || null,
        message: message || null,
        created_by: userId,
      })
      .select()
      .single();

    if (reviewError) {
      return handleSupabaseError(reviewError);
    }

    // Create review assignments for each reviewer
    const assignments = reviewers.map((reviewer: { user_id: string; user_email: string }) => ({
      review_id: review.id,
      user_id: reviewer.user_id,
      email: reviewer.user_email,
      status: 'pending',
    }));

    const { error: assignmentsError } = await supabase
      .from('cardmock_review_assignments')
      .insert(assignments);

    if (assignmentsError) {
      // Rollback review if assignments fail
      await supabase.from('cardmock_reviews').delete().eq('id', review.id);
      return handleSupabaseError(assignmentsError);
    }

    // Update mockup status to 'in_review'
    await supabase
      .from('assets')
      .update({ status: 'in_review' })
      .eq('id', mockupId);

    // Send email notifications to reviewers
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cardmock.app';
    const reviewUrl = `${baseUrl}/mockups/${mockupId}`;
    const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'Someone';

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Review requested: ${mockup.mockup_name}</h2>

        <p style="color: #666;">${userName} needs your feedback on this CardMock design.</p>

        ${mockup.mockup_image_url ? `
          <div style="margin: 24px 0;">
            <img src="${mockup.mockup_image_url}" alt="${mockup.mockup_name}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
          </div>
        ` : ''}

        ${message ? `
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="color: #666; margin: 0;">"${message}"</p>
          </div>
        ` : ''}

        ${dueDate ? `
          <p style="color: #d97706; font-weight: 500;">Due: ${new Date(dueDate).toLocaleDateString()}</p>
        ` : ''}

        <a href="${reviewUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;">
          Review CardMock
        </a>

        <p style="color: #999; font-size: 12px;">
          ${reviewType === 'all' ? 'All reviewers must approve this design.' : 'Any reviewer can approve this design.'}
        </p>
      </div>
    `;

    const reviewerEmails = reviewers
      .filter((r: { user_email?: string }) => r.user_email)
      .map((r: { user_email?: string }) => r.user_email) as string[];

    if (reviewerEmails.length > 0) {
      try {
        await sendEmail({
          to: reviewerEmails,
          subject: `Review requested: ${mockup.mockup_name}`,
          html: htmlContent,
        });
        logger.info('Review request emails sent', { mockupId, reviewerCount: reviewerEmails.length });
      } catch (emailError) {
        logger.error('Failed to send review request emails', emailError as Error, { mockupId });
        // Don't fail the whole request if email fails
      }
    }

    // Log activity
    await supabase.from('cardmock_activity').insert({
      cardmock_id: mockupId,
      action: 'review_requested',
      actor_id: userId,
      metadata: {
        review_id: review.id,
        reviewer_count: reviewers.length,
        due_date: dueDate,
        review_type: reviewType,
      },
    }).catch(() => {});

    return successResponse({
      review,
      message: 'Review request sent successfully',
    });
  } catch (error) {
    return errorResponse(error, 'Failed to request review');
  }
}
