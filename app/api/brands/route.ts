import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { checkRequiredFields } from '@/lib/api/error-handler';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/brands
 *
 * Get all brands for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    logger.api('/api/brands', 'GET', { orgId });

    const { data: brands, error } = await supabaseServer
      .from('brands')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ brands: brands || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch brands');
  }
}

/**
 * POST /api/brands
 *
 * Create a new brand
 *
 * Body:
 * {
 *   company_name: string (required),
 *   domain: string (required),
 *   description?: string (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await request.json();
    const { company_name, domain, description } = body;

    logger.api('/api/brands', 'POST', { orgId, userId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['company_name', 'domain']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    // Validate company_name
    if (typeof company_name !== 'string' || company_name.trim().length === 0) {
      return badRequestResponse('Company name is required');
    }

    // Validate domain
    if (typeof domain !== 'string' || domain.trim().length === 0) {
      return badRequestResponse('Domain is required');
    }

    // Create brand
    const { data: brand, error } = await supabaseServer
      .from('brands')
      .insert({
        company_name: company_name.trim(),
        domain: domain.trim(),
        description: description?.trim() || null,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ brand }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to create brand');
  }
}

