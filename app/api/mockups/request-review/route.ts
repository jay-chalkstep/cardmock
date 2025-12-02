import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getUserInfo, getOrgMembers } from '@/lib/api/auth';
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
    const { userId, orgId } = authResult;

    const supabase = createServerAdminClient();
    const body = await request.json();
    const { mockupId, reviewerIds = [], externalEmails = [], dueDate, message, reviewType } = body;

    logger.api('/api/mockups/request-review', 'POST', { orgId, userId, mockupId });
    logger.info('Request review - auth context', { orgId, userId, mockupId });

    if (!mockupId) {
      logger.error('Request review - mockupId is missing', null, { body });
      return badRequestResponse('mockupId is required');
    }

    const hasOrgReviewers = reviewerIds && reviewerIds.length > 0;
    const hasExternalReviewers = externalEmails && externalEmails.length > 0;

    if (!hasOrgReviewers && !hasExternalReviewers) {
      return badRequestResponse('At least one reviewer is required');
    }

    // First, check if mockup exists at all (for debugging)
    const { data: mockupCheck, error: checkError } = await supabase
      .from('assets')
      .select('id, organization_id, mockup_name, mockup_image_url, status')
      .eq('id', mockupId)
      .single();

    if (checkError || !mockupCheck) {
      logger.error('Request review - mockup does not exist', checkError ? {
        message: checkError.message,
        code: checkError.code,
        details: checkError.details,
        hint: checkError.hint,
      } : null, { mockupId });
      return notFoundResponse('Mockup not found');
    }

    logger.info('Request review - mockup found', {
      mockupId,
      mockupOrgId: mockupCheck.organization_id,
      requestOrgId: orgId,
      mockupName: mockupCheck.mockup_name,
    });

    // Log if there's an organization mismatch
    if (mockupCheck.organization_id !== orgId) {
      logger.error('Request review - organization mismatch', null, {
        mockupId,
        mockupOrgId: mockupCheck.organization_id,
        requestOrgId: orgId,
        mockupName: mockupCheck.mockup_name,
      });
      // Return a more helpful error message for organization mismatch
      return NextResponse.json(
        {
          success: false,
          error: 'This mockup belongs to a different organization. Please refresh the page and try again.',
          code: 'ORG_MISMATCH'
        },
        { status: 403 }
      );
    }

    // Use the mockup data from the first query (already verified org matches)
    const mockup = mockupCheck;

    // Get reviewer details from Clerk for org members
    let orgReviewers: { id: string; name: string; email: string }[] = [];
    if (hasOrgReviewers) {
      const allMembers = await getOrgMembers(orgId);
      orgReviewers = allMembers.filter(m => reviewerIds.includes(m.id));
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

    // Create review assignments for org members
    const orgAssignments = orgReviewers.map((reviewer) => ({
      review_id: review.id,
      user_id: reviewer.id,
      email: reviewer.email,
      status: 'pending',
    }));

    // Create review assignments for external reviewers (no user_id)
    const externalAssignments = (externalEmails as string[]).map((email: string) => ({
      review_id: review.id,
      user_id: null,
      email: email,
      status: 'pending',
    }));

    const allAssignments = [...orgAssignments, ...externalAssignments];

    const { error: assignmentsError } = await supabase
      .from('cardmock_review_assignments')
      .insert(allAssignments);

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

    // Send email notifications to all reviewers
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cardmock.app';
    const reviewUrl = `${baseUrl}/mockups/${mockupId}`;
    const userInfo = await getUserInfo(userId);
    const userName = userInfo.name || 'Someone';

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

    // Combine all reviewer emails (org members + external)
    const allReviewerEmails = [
      ...orgReviewers.map(r => r.email).filter(Boolean),
      ...(externalEmails as string[]),
    ];

    if (allReviewerEmails.length > 0) {
      try {
        await sendEmail({
          to: allReviewerEmails,
          subject: `Review requested: ${mockup.mockup_name}`,
          html: htmlContent,
        });
        logger.info('Review request emails sent', { mockupId, reviewerCount: allReviewerEmails.length });
      } catch (emailError) {
        logger.error('Failed to send review request emails', emailError as Error, { mockupId });
        // Don't fail the whole request if email fails
      }
    }

    // Log activity (fire and forget)
    supabase.from('cardmock_activity').insert({
      cardmock_id: mockupId,
      action: 'review_requested',
      actor_id: userId,
      metadata: {
        review_id: review.id,
        reviewer_count: allAssignments.length,
        external_count: externalAssignments.length,
        due_date: dueDate,
        review_type: reviewType,
      },
    }).then(() => {}, () => {});

    return successResponse({
      review,
      message: 'Review request sent successfully',
    });
  } catch (error) {
    return errorResponse(error, 'Failed to request review');
  }
}
