import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { checkRequiredFields } from '@/lib/api/error-handler';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email-mockups
 *
 * Get all email mockups for the current organization
 *
 * Query params:
 * - contract_id?: string (optional filter by contract)
 * - project_id?: string (optional filter by project)
 * - status?: string (optional filter by status)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contract_id');
    const projectId = searchParams.get('project_id');
    const statusFilter = searchParams.get('status');

    logger.api('/api/email-mockups', 'GET', { orgId, contractId, projectId, statusFilter });

    // Build query
    let query = supabaseServer
      .from('email_mockups')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (contractId) {
      query = query.eq('contract_id', contractId);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: mockups, error } = await query;

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ mockups: mockups || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch email mockups');
  }
}

/**
 * POST /api/email-mockups
 *
 * Create a new email mockup
 *
 * Body:
 * {
 *   contract_id?: string (optional),
 *   project_id?: string (optional),
 *   name: string (required),
 *   html_content: string (required),
 *   branding_data?: object (optional),
 *   status?: string (default: 'draft')
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await request.json();
    const {
      contract_id,
      project_id,
      name,
      html_content,
      branding_data,
      status = 'draft',
    } = body;

    logger.api('/api/email-mockups', 'POST', { orgId, userId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['name', 'html_content']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
      return badRequestResponse('Name is required');
    }

    // Validate html_content
    if (typeof html_content !== 'string' || html_content.trim().length === 0) {
      return badRequestResponse('HTML content is required');
    }

    // Validate contract exists if provided
    if (contract_id) {
      const { data: contract } = await supabaseServer
        .from('contracts')
        .select('id')
        .eq('id', contract_id)
        .eq('organization_id', orgId)
        .single();

      if (!contract) {
        return badRequestResponse('Contract not found');
      }
    }

    // Validate project exists if provided
    if (project_id) {
      const { data: project } = await supabaseServer
        .from('projects')
        .select('id')
        .eq('id', project_id)
        .eq('organization_id', orgId)
        .single();

      if (!project) {
        return badRequestResponse('Project not found');
      }
    }

    // Create email mockup
    const { data: mockup, error } = await supabaseServer
      .from('email_mockups')
      .insert({
        contract_id: contract_id || null,
        project_id: project_id || null,
        name: name.trim(),
        html_content: html_content.trim(),
        branding_data: branding_data || {},
        status,
        organization_id: orgId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ mockup }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create email mockup');
  }
}

