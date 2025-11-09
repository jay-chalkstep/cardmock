import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-server';

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
    const { userId, orgId } = await auth();
    const { id: mockupId } = await context.params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      comment_text,
      annotation_data,
      position_x,
      position_y,
      annotation_type,
      annotation_color
    } = body;

    if (!comment_text || comment_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'comment_text is required' },
        { status: 400 }
      );
    }

    // Verify mockup exists and user has access (creator or reviewer)
    const { data: mockup, error: mockupError } = await supabaseServer
      .from('assets')
      .select('*')
      .eq('id', mockupId)
      .eq('organization_id', orgId)
      .single();

    if (mockupError || !mockup) {
      return NextResponse.json(
        { error: 'Mockup not found' },
        { status: 404 }
      );
    }

    // Check if user is creator or reviewer
    const isCreator = mockup.created_by === userId;
    let isReviewer = false;

    if (!isCreator) {
      const { data: reviewerAccess } = await supabaseServer
        .from('mockup_reviewers')
        .select('id')
        .eq('asset_id', mockupId)
        .eq('reviewer_id', userId)
        .single();

      isReviewer = !!reviewerAccess;
    }

    if (!isCreator && !isReviewer) {
      return NextResponse.json(
        { error: 'You do not have permission to comment on this mockup' },
        { status: 403 }
      );
    }

    // Get user details from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
    const userEmail = user.emailAddresses[0]?.emailAddress || '';

    // Create comment record
    const { data: comment, error: createError } = await supabaseServer
      .from('mockup_comments')
      .insert({
        asset_id: mockupId,
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
      })
      .select()
      .single();

    if (createError) throw createError;

    // Mark reviewer as "viewed" if they haven't viewed yet
    if (isReviewer) {
      await supabaseServer
        .from('mockup_reviewers')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString()
        })
        .eq('asset_id', mockupId)
        .eq('reviewer_id', userId)
        .eq('status', 'pending'); // Only update if still pending
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
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
    const { userId, orgId } = await auth();
    const { id: mockupId } = await context.params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: comments, error } = await supabaseServer
      .from('mockup_comments')
      .select('*')
      .eq('asset_id', mockupId)
      .eq('organization_id', orgId)
      .is('deleted_at', null) // Filter out soft-deleted comments
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
