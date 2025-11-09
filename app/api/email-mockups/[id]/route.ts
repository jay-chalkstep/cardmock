import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email-mockups/[id]
 *
 * Get a single email mockup
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/email-mockups/${id}`, 'GET', { orgId });

    const { data: mockup, error } = await supabaseServer
      .from('email_mockups')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !mockup) {
      return notFoundResponse('Email mockup not found');
    }

    return successResponse({ mockup });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch email mockup');
  }
}

/**
 * PATCH /api/email-mockups/[id]
 *
 * Update an email mockup
 *
 * Body:
 * {
 *   name?: string,
 *   html_content?: string,
 *   branding_data?: object,
 *   status?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;
    const body = await request.json();
    const { name, html_content, branding_data, status } = body;

    logger.api(`/api/email-mockups/${id}`, 'PATCH', { orgId });

    // Check if mockup exists
    const { data: existingMockup } = await supabaseServer
      .from('email_mockups')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existingMockup) {
      return notFoundResponse('Email mockup not found');
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (html_content !== undefined) updateData.html_content = html_content.trim();
    if (branding_data !== undefined) updateData.branding_data = branding_data;
    if (status !== undefined) updateData.status = status;

    // Update mockup
    const { data: mockup, error } = await supabaseServer
      .from('email_mockups')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ mockup });
  } catch (error) {
    return errorResponse(error, 'Failed to update email mockup');
  }
}

/**
 * DELETE /api/email-mockups/[id]
 *
 * Delete an email mockup
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/email-mockups/${id}`, 'DELETE', { orgId });

    // Check if mockup exists
    const { data: existingMockup } = await supabaseServer
      .from('email_mockups')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existingMockup) {
      return notFoundResponse('Email mockup not found');
    }

    // Delete mockup
    const { error } = await supabaseServer
      .from('email_mockups')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ message: 'Email mockup deleted successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to delete email mockup');
  }
}

