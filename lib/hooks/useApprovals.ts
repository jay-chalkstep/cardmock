/**
 * Custom hook for managing approvals
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import type { AssetApprovalSummary } from '@/lib/supabase';

interface UseApprovalsOptions {
  mockupId: string;
  enabled?: boolean;
}

export function useApprovals({ mockupId, enabled = true }: UseApprovalsOptions) {
  const [approvalSummary, setApprovalSummary] = useState<AssetApprovalSummary | null>(null);
  const [isCurrentUserReviewer, setIsCurrentUserReviewer] = useState(false);
  const [hasCurrentUserApproved, setHasCurrentUserApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchApprovals = useCallback(async () => {
    if (!enabled || !mockupId) return;

    try {
      setLoading(true);
      setError(null);

      logger.api(`/api/mockups/${mockupId}/approvals`, 'GET', { mockupId });

      const response = await fetch(`/api/mockups/${mockupId}/approvals`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch approvals: ${response.status}`);
      }

      const data: AssetApprovalSummary = await response.json();

      // Count total approvals across all stages
      const totalApprovals = Object.values(data.approvals_by_stage || {})
        .reduce((sum, stageApprovals) => sum + stageApprovals.length, 0);

      logger.info('Approvals fetched successfully', {
        mockupId,
        totalApprovals,
        stagesCount: Object.keys(data.approvals_by_stage || {}).length,
      });

      setApprovalSummary(data);
      setIsCurrentUserReviewer(data.is_current_user_reviewer || false);
      setHasCurrentUserApproved(data.has_current_user_approved || false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('Failed to fetch approvals', error, { mockupId });
    } finally {
      setLoading(false);
    }
  }, [mockupId, enabled]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  return {
    approvalSummary,
    isCurrentUserReviewer,
    hasCurrentUserApproved,
    loading,
    error,
    refetch: fetchApprovals,
  };
}

