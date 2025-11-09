/**
 * Custom hook for managing AI metadata
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import type { AIMetadata } from '@/types/ai';

interface UseAIMetadataOptions {
  mockupId: string;
  enabled?: boolean;
}

export function useAIMetadata({ mockupId, enabled = true }: UseAIMetadataOptions) {
  const [aiMetadata, setAiMetadata] = useState<AIMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Transform API response to AIMetadata type
  const transformAIMetadata = useCallback((dbMetadata: any): AIMetadata | null => {
    if (!dbMetadata) return null;

    return {
      id: dbMetadata.id,
      mockupId: dbMetadata.mockup_id || dbMetadata.asset_id,
      autoTags: dbMetadata.auto_tags || {
        visual: [],
        colors: [],
        composition: [],
        brands: [],
        objects: [],
        confidence: 0,
      },
      colorPalette: dbMetadata.color_palette || {
        dominant: [],
        accent: [],
        neutral: [],
      },
      extractedText: dbMetadata.extracted_text || null,
      accessibilityScore: dbMetadata.accessibility_score || {
        wcagLevel: null,
        contrastRatio: null,
        readability: null,
        issues: [],
        suggestions: [],
      },
      embedding: dbMetadata.embedding,
      searchText: dbMetadata.search_text || '',
      lastAnalyzed: dbMetadata.last_analyzed || new Date().toISOString(),
      analysisVersion: dbMetadata.analysis_version,
    };
  }, []);

  const fetchAIMetadata = useCallback(async () => {
    if (!enabled || !mockupId) return;

    try {
      setLoading(true);
      setError(null);

      logger.api(`/api/ai/analyze?mockupId=${mockupId}`, 'GET', { mockupId });

      const response = await fetch(`/api/ai/analyze?mockupId=${mockupId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch AI metadata: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || result;

      if (data.analyzed && data.metadata) {
        const transformedMetadata = transformAIMetadata(data.metadata);
        setAiMetadata(transformedMetadata);
        logger.info('AI metadata fetched successfully', { mockupId });
      } else {
        setAiMetadata(null);
        logger.debug('No AI metadata available', { mockupId });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setAiMetadata(null);
      logger.error('Failed to fetch AI metadata', error, { mockupId });
    } finally {
      setLoading(false);
    }
  }, [mockupId, enabled, transformAIMetadata]);

  const analyzeWithAI = useCallback(async (): Promise<boolean> => {
    if (!mockupId) return false;

    try {
      setAnalyzing(true);
      setError(null);

      logger.api('/api/ai/analyze', 'POST', { mockupId });

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockupId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze mockup');
      }

      const result = await response.json();
      const data = result.data || result;

      if (result.success || data.metadata) {
        // Refetch metadata after successful analysis
        await fetchAIMetadata();
        logger.info('AI analysis completed successfully', { mockupId });
        return true;
      } else {
        throw new Error('Invalid response from analysis API');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('Failed to analyze mockup', error, { mockupId });
      return false;
    } finally {
      setAnalyzing(false);
    }
  }, [mockupId, fetchAIMetadata]);

  useEffect(() => {
    fetchAIMetadata();
  }, [fetchAIMetadata]);

  return {
    aiMetadata,
    loading,
    error,
    analyzing,
    refetch: fetchAIMetadata,
    analyze: analyzeWithAI,
  };
}

