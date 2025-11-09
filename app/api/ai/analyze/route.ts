/**
 * AI Analyze API Endpoint
 * POST /api/ai/analyze
 * Analyzes a mockup using Google Vision and OpenAI to extract tags, colors, text, and embeddings
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { analyzeAndTagMockup, getMockupAIMetadata } from '@/lib/ai/vision-tagging';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const body = await req.json();
    const { mockupId } = body;

    logger.api('/api/ai/analyze', 'POST', { orgId, mockupId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['mockupId']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    // Fetch mockup from database
    const { data: mockup, error: mockupError } = await supabaseServer
      .from('assets')
      .select('id, mockup_name, mockup_image_url, organization_id')
      .eq('id', mockupId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    // Verify mockup belongs to user's organization
    if (mockup.organization_id !== orgId) {
      return forbiddenResponse('Mockup does not belong to your organization');
    }

    // Check if mockup has an image URL
    if (!mockup.mockup_image_url) {
      return badRequestResponse('Mockup has no image to analyze');
    }

    // Analyze the mockup
    const result = await analyzeAndTagMockup(
      mockup.id,
      mockup.mockup_image_url,
      mockup.mockup_name,
      '' // description - mockups don't have descriptions in current schema
    );

    if (!result.success) {
      return errorResponse(new Error(result.error || 'Analysis failed'), 'Analysis failed');
    }

    logger.info('AI analysis completed successfully', { mockupId });

    // Return the AI metadata
    return successResponse({
      metadata: result.metadata,
      message: 'Analysis completed successfully',
    });
  } catch (error) {
    return errorResponse(error, 'Failed to analyze mockup');
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    // Get mockupId from query params
    const { searchParams } = new URL(req.url);
    const mockupId = searchParams.get('mockupId');

    logger.api('/api/ai/analyze', 'GET', { orgId, mockupId });

    if (!mockupId) {
      return badRequestResponse('mockupId query parameter is required');
    }

    // Verify mockup belongs to user's organization
    const { data: mockup, error: mockupError } = await supabaseServer
      .from('assets')
      .select('organization_id')
      .eq('id', mockupId)
      .single();

    if (mockupError || !mockup) {
      return notFoundResponse('Mockup not found');
    }

    if (mockup.organization_id !== orgId) {
      return forbiddenResponse('Mockup does not belong to your organization');
    }

    // Get AI metadata
    const metadata = await getMockupAIMetadata(mockupId);

    if (!metadata) {
      return successResponse({
        analyzed: false,
        metadata: null,
      });
    }

    return successResponse({
      analyzed: true,
      metadata,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch AI metadata');
  }
}
