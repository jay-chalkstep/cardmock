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

      const { data: reviewerData, error: reviewerError } = await supabase
        .from('mockup_reviewers')
        .select('id')
        .eq('asset_id', mockupId)
        .eq('reviewer_id', userId)
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

