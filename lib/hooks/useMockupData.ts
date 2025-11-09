/**
 * Custom hook for fetching mockup data
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, CardMockup } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

interface UseMockupDataOptions {
  mockupId: string;
  organizationId: string | undefined;
  userId: string | undefined;
  onError?: (error: Error) => void;
  onSuccess?: (mockup: CardMockup) => void;
}

export function useMockupData({
  mockupId,
  organizationId,
  userId,
  onError,
  onSuccess,
}: UseMockupDataOptions) {
  const router = useRouter();
  const [mockup, setMockup] = useState<CardMockup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!organizationId || !userId || !mockupId) {
      setLoading(false);
      return;
    }

    const fetchMockupData = async () => {
      try {
        setLoading(true);
        setError(null);

        logger.db('Fetching mockup data', { mockupId, organizationId });

        const { data, error: queryError } = await supabase
          .from('assets')
          .select(`
            *,
            logo:logo_variants(*),
            template:templates(*)
          `)
          .eq('id', mockupId)
          .eq('organization_id', organizationId)
          .single();

        if (queryError) {
          logger.error('Error fetching mockup data', queryError, {
            mockupId,
            organizationId,
            code: queryError.code,
          });
          throw queryError;
        }

        if (!data) {
          const notFoundError = new Error('Mockup not found');
          logger.error('Mockup not found', notFoundError, { mockupId, organizationId });
          throw notFoundError;
        }

        logger.info('Mockup data fetched successfully', {
          id: data.id,
          mockup_name: data.mockup_name,
        });

        setMockup(data as CardMockup);
        onSuccess?.(data as CardMockup);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        logger.error('Failed to fetch mockup data', error, { mockupId, organizationId });
        onError?.(error);
        
        // Navigate to gallery if mockup not found
        if (error.message.includes('not found')) {
          router.push('/gallery');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMockupData();
  }, [mockupId, organizationId, userId, router, onError, onSuccess]);

  return { mockup, loading, error, refetch: () => {
    if (organizationId && userId && mockupId) {
      // Trigger refetch by updating dependencies
      setLoading(true);
    }
  }};
}

