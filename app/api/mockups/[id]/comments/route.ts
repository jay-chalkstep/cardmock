import { NextRequest } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * POST /api/mockups/[id]/comments
 *
 * Create a new comment with optional annotation data
 *
 * Body:
 * {
 *   comment_text: string (required),
 *   annotation_data?: object (Konva shape JSON),
 *   position_x?: number (% from left, 0-100),
 *   position_y?: number (% from top, 0-100),
 *   annotation_type?: 'pin' | 'arrow' | 'circle' | 'rect' | 'freehand' | 'text' | 'none',
 *   annotation_color?: string (hex color)
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id: mockupId } = await context.params;

    logger.api(`/api/mockups/${mockupId}/comments`, 'POST', { orgId, userId });

    const body = await request.json();
    const {
      comment_text,
      annotation_data,
      position_x,
      position_y,
      annotation_type,
      annotation_color
    } = body;

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['comment_text']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    if (!comment_text || comment_text.trim().length === 0) {
      return badRequestResponse('comment_text is required');
    }

    // Verify mockup exists and user has access (creator or reviewer)
    const { data: mockup, error: mockupError } = await supabaseServer
      .from('assets')
      .select('*')
      .eq('id', mockupId)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    // Check if user is creator or reviewer
    const isCreator = mockup.created_by === userId;
    let isReviewer = false;

    if (!isCreator && mockup.project_id) {
      // Check if user is a reviewer for this project
      const { data: reviewerAccess } = await supabaseServer
        .from('project_stage_reviewers')
        .select('id')
        .eq('project_id', mockup.project_id)
        .eq('user_id', userId)
        .maybeSingle();

      isReviewer = !!reviewerAccess;
    }

    if (!isCreator && !isReviewer) {
      return forbiddenResponse('You do not have permission to comment on this mockup');
    }

    // Get user details from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
    const userEmail = user.emailAddresses[0]?.emailAddress || '';

    // Create comment record - try asset_id first, fallback to mockup_id if needed
    let insertData: any = {
      user_id: userId,
      user_name: fullName,
      user_email: userEmail,
      user_avatar: user.imageUrl,
      comment_text: comment_text.trim(),
      annotation_data: annotation_data || null,
      position_x: position_x || null,
      position_y: position_y || null,
      annotation_type: annotation_type || 'none',
      annotation_color: annotation_color || '#FF6B6B',
      organization_id: orgId
    };

    // Try asset_id first (post-migration 13)
    insertData.asset_id = mockupId;
    let { data: comment, error: createError } = await supabaseServer
      .from('mockup_comments')
      .insert(insertData)
      .select()
      .single();

    // If error suggests column doesn't exist, try mockup_id (pre-migration 13)
    if (createError && createError.message?.includes('column') && createError.message?.includes('asset_id')) {
      logger.warn('asset_id column not found, trying mockup_id (pre-migration 13)', { mockupId, orgId });
      delete insertData.asset_id;
      insertData.mockup_id = mockupId;
      const result = await supabaseServer
        .from('mockup_comments')
        .insert(insertData)
        .select()
        .single();
      comment = result.data;
      createError = result.error;
    }

    if (createError) {
      logger.error('Error creating comment', { error: createError, mockupId, orgId, userId });
      return handleSupabaseError(createError);
    }

    logger.info('Comment created successfully', { commentId: comment?.id, mockupId, hasAnnotation: !!annotation_data });

    // Note: Reviewer viewing status is now tracked via project_stage_reviewers
    // No need to update a separate table for viewed status

    return successResponse({ comment }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create comment');
  }
}

/**
 * GET /api/mockups/[id]/comments
 *
 * Get all comments for a mockup
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id: mockupId } = await context.params;

    logger.api(`/api/mockups/${mockupId}/comments`, 'GET', { orgId });

    // Try asset_id first (post-migration 13), fallback to mockup_id if needed
    let { data: comments, error } = await supabaseServer
      .from('mockup_comments')
      .select('*')
      .eq('asset_id', mockupId)
      .eq('organization_id', orgId)
      .is('deleted_at', null) // Filter out soft-deleted comments
      .order('created_at', { ascending: true });

    // If error suggests column doesn't exist, try mockup_id (pre-migration 13)
    if (error && error.message?.includes('column') && error.message?.includes('asset_id')) {
      logger.warn('asset_id column not found, trying mockup_id (pre-migration 13)', { mockupId, orgId });
      const result = await supabaseServer
        .from('mockup_comments')
        .select('*')
        .eq('mockup_id', mockupId)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      comments = result.data;
      error = result.error;
    }

    if (error) {
      logger.error('Error fetching comments', { error, mockupId, orgId });
      return handleSupabaseError(error);
    }

    logger.info('Comments fetched successfully', { mockupId, count: comments?.length || 0 });
    return successResponse({ comments: comments || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch comments');
  }
}
