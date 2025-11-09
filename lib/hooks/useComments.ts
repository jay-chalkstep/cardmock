/**
 * Custom hook for managing comments
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';

export interface Comment {
  id: string;
  mockup_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  comment_text: string;
  annotation_data?: any;
  position_x?: number;
  position_y?: number;
  annotation_type?: string;
  annotation_color?: string;
  is_resolved: boolean;
  parent_comment_id?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  resolved_by?: string;
  resolved_by_name?: string;
  resolved_at?: string;
  resolution_note?: string;
  deleted_at?: string;
  deleted_by?: string;
  deleted_by_name?: string;
  edit_history?: Array<{
    edited_at: string;
    edited_by: string;
    edited_by_name: string;
    old_text: string;
    new_text: string;
  }>;
  original_comment_text?: string;
}

interface UseCommentsOptions {
  mockupId: string;
  enabled?: boolean;
}

export function useComments({ mockupId, enabled = true }: UseCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchComments = useCallback(async () => {
    if (!enabled || !mockupId) return;

    try {
      setLoading(true);
      setError(null);

      logger.api(`/api/mockups/${mockupId}/comments`, 'GET', { mockupId });

      const response = await fetch(`/api/mockups/${mockupId}/comments`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch comments: ${response.status}`);
      }

      const data = await response.json();
      const fetchedComments = data.comments || data.data?.comments || [];

      logger.info('Comments fetched successfully', {
        mockupId,
        count: fetchedComments.length,
      });

      setComments(fetchedComments);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('Failed to fetch comments', error, { mockupId });
    } finally {
      setLoading(false);
    }
  }, [mockupId, enabled]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    refetch: fetchComments,
  };
}

