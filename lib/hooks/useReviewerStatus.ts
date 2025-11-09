/**
 * Custom hook for checking reviewer status
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

interface UseReviewerStatusOptions {
  mockupId: string;
  userId: string | undefined;
  isCreator: boolean;
  enabled?: boolean;
}

export function useReviewerStatus({
  mockupId,
  userId,
  isCreator,
  enabled = true,
}: UseReviewerStatusOptions) {
  const [isReviewer, setIsReviewer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkReviewerStatus = useCallback(async () => {
    if (!enabled || !mockupId || !userId || isCreator) {
      setIsReviewer(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.db('Checking reviewer status', { mockupId, userId });

      // First, get the mockup's project_id
      const { data: mockup, error: mockupError } = await supabase
        .from('assets')
        .select('project_id')
        .eq('id', mockupId)
        .single();

      if (mockupError || !mockup?.project_id) {
        setIsReviewer(false);
        return;
      }

      // Check if user is a reviewer for this project
      const { data: reviewerData, error: reviewerError } = await supabase
        .from('project_stage_reviewers')
        .select('id')
        .eq('project_id', mockup.project_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (reviewerError) {
        logger.error('Error checking reviewer status', reviewerError, {
          mockupId,
          userId,
        });
        setError(reviewerError);
        setIsReviewer(false);
        return;
      }

      const reviewerStatus = !!reviewerData;
      setIsReviewer(reviewerStatus);

      logger.debug('Reviewer status checked', {
        mockupId,
        userId,
        isReviewer: reviewerStatus,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsReviewer(false);
      logger.error('Failed to check reviewer status', error, { mockupId, userId });
    } finally {
      setLoading(false);
    }
  }, [mockupId, userId, isCreator, enabled]);

  useEffect(() => {
    checkReviewerStatus();
  }, [checkReviewerStatus]);

  return {
    isReviewer,
    loading,
    error,
    refetch: checkReviewerStatus,
  };
}

