/**
 * AI Similar Mockups API Endpoint
 * POST /api/ai/similar
 * Finds similar mockups using pgvector similarity search
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { AI_CONFIG } from '@/lib/ai/config';
import { logAIOperation } from '@/lib/ai/utils';
import { logger } from '@/lib/utils/logger';
import type { SimilarMockupResult } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const body = await req.json();
    const { mockupId, limit } = body;

    logger.api('/api/ai/similar', 'POST', { orgId, mockupId });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['mockupId']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    const searchLimit = limit || AI_CONFIG.DEFAULT_SIMILAR_COUNT;

    logAIOperation('Finding similar mockups', { mockupId, limit: searchLimit });

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

    // Check if mockup has been analyzed (has embedding)
    const { data: aiMetadata, error: metadataError } = await supabaseServer
      .from('mockup_ai_metadata')
      .select('embedding')
      .eq('asset_id', mockupId)
      .single();

    if (metadataError || !aiMetadata || !aiMetadata.embedding) {
      return badRequestResponse('Mockup has not been analyzed yet. Please analyze it first using the AI analysis feature.');
    }

    // Call the RPC function to find similar mockups
    const { data: similarMockups, error: rpcError } = await supabaseServer.rpc(
      'find_similar_mockups',
      {
        mockup_id: mockupId,
        match_count: searchLimit,
      }
    );

    if (rpcError) {
      return handleSupabaseError(rpcError);
    }

    const results = (similarMockups || []) as SimilarMockupResult[];

    logAIOperation('Found similar mockups', {
      mockupId,
      count: results.length,
    });

    logger.info('Similar mockups found', { mockupId, count: results.length });

    return successResponse({
      mockupId,
      similar: results,
      count: results.length,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to find similar mockups');
  }
}

// GET endpoint for retrieving similar mockups (alternative to POST)
export async function GET(req: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    const { searchParams } = new URL(req.url);
    const mockupId = searchParams.get('mockupId');
    const limit = parseInt(searchParams.get('limit') || String(AI_CONFIG.DEFAULT_SIMILAR_COUNT), 10);

    logger.api('/api/ai/similar', 'GET', { orgId, mockupId, limit });

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

    // Check if mockup has been analyzed
    const { data: aiMetadata, error: metadataError } = await supabaseServer
      .from('mockup_ai_metadata')
      .select('embedding')
      .eq('asset_id', mockupId)
      .single();

    if (metadataError || !aiMetadata || !aiMetadata.embedding) {
      return badRequestResponse('Mockup has not been analyzed yet');
    }

    // Find similar mockups
    const { data: similarMockups, error: rpcError } = await supabaseServer.rpc(
      'find_similar_mockups',
      {
        mockup_id: mockupId,
        match_count: limit,
      }
    );

    if (rpcError) {
      return handleSupabaseError(rpcError);
    }

    return successResponse({
      mockupId,
      similar: similarMockups || [],
      count: (similarMockups || []).length,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to find similar mockups');
  }
}
