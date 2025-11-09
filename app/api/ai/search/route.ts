/**
 * AI Search API Endpoint
 * POST /api/ai/search
 * Performs semantic and hybrid search using OpenAI embeddings and pgvector
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { getOpenAIClient, AI_MODELS, AI_CONFIG } from '@/lib/ai/config';
import { logAIOperation } from '@/lib/ai/utils';
import { logger } from '@/lib/utils/logger';
import type { HybridSearchResult } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await req.json();
    const { query, searchType = 'hybrid' } = body;

    logger.api('/api/ai/search', 'POST', { orgId, userId, searchType });

    // Validate required fields
    const missingFieldsCheck = checkRequiredFields(body, ['query']);
    if (missingFieldsCheck) {
      return missingFieldsCheck;
    }

    if (typeof query !== 'string') {
      return badRequestResponse('query must be a string');
    }

    logAIOperation('AI Search', { query, searchType, orgId });

    // Determine if it's a natural language query
    const isNaturalLanguage = query.split(' ').length > 2;

    let results: any[] = [];

    if (searchType === 'semantic' || searchType === 'hybrid') {
      // Generate embedding for the query
      const openai = getOpenAIClient();
      const embeddingResponse = await openai.embeddings.create({
        model: AI_MODELS.EMBEDDING,
        input: query,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Store query for analytics
      await supabaseServer.from('search_queries').insert({
        query,
        query_embedding: queryEmbedding,
        natural_language: isNaturalLanguage,
        user_id: userId,
        org_id: orgId,
      });

      if (searchType === 'hybrid' && isNaturalLanguage) {
        // Hybrid search: combines text search + vector similarity
        const { data: hybridData, error: hybridError } = await supabaseServer.rpc(
          'hybrid_search_mockups',
          {
            text_query: query,
            query_embedding: queryEmbedding,
            match_count: AI_CONFIG.DEFAULT_SEARCH_RESULTS,
            org_id: orgId,
          }
        );

        if (hybridError) {
          throw new Error(`Hybrid search error: ${hybridError.message}`);
        }

        results = hybridData || [];
      } else {
        // Pure semantic search using vector similarity
        const { data: semanticData, error: semanticError } = await supabaseServer.rpc(
          'search_mockups_by_embedding',
          {
            query_embedding: queryEmbedding,
            match_threshold: AI_CONFIG.SIMILARITY_THRESHOLD,
            match_count: AI_CONFIG.DEFAULT_SEARCH_RESULTS,
            org_id: orgId,
          }
        );

        if (semanticError) {
          throw new Error(`Semantic search error: ${semanticError.message}`);
        }

        results = semanticData || [];
      }
    } else {
      // Fallback to traditional text search if searchType is 'text'
      const { data: mockups, error: searchError } = await supabaseServer
        .from('assets')
        .select(`
          id,
          mockup_name,
          mockup_image_url,
          folder_id,
          project_id,
          created_at
        `)
        .eq('organization_id', orgId)
        .ilike('mockup_name', `%${query}%`)
        .limit(AI_CONFIG.DEFAULT_SEARCH_RESULTS);

      if (searchError) {
        throw new Error(`Text search error: ${searchError.message}`);
      }

      results = mockups || [];
    }

    // Update search query with results count
    await supabaseServer
      .from('search_queries')
      .update({ results_count: results.length })
      .eq('query', query)
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1);

    logAIOperation('Search completed', { resultsCount: results.length });
    logger.info('AI search completed successfully', { query, searchType, resultsCount: results.length });

    return successResponse({
      results,
      query,
      searchType,
      resultsCount: results.length,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to perform search');
  }
}

// GET endpoint to retrieve search history
export async function GET(req: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    logger.api('/api/ai/search', 'GET', { orgId, userId, limit });

    // Get recent search queries for the user
    const { data: queries, error } = await supabaseServer
      .from('search_queries')
      .select('id, query, natural_language, results_count, created_at')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({
      queries: queries || [],
    });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch search history');
  }
}
