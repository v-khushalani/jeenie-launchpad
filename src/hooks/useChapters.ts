/**
 * useChapters Hook (Enterprise Grade)
 * 
 * Uses the new API service layer with caching
 */

import { useState, useEffect, useCallback } from 'react';
import { chaptersAPI } from '@/services/api/modules/chapters';
import type { Chapter as APIChapter } from '@/services/api/types';
import { logger } from '@/utils/logger';

export interface Chapter {
  id: string;
  batch_id: string | null;
  subject: string;
  chapter_number: number;
  chapter_name: string;
  description?: string | null;
}

export const useChapters = (batchId: string | null, subject: string | null) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    if (!batchId || !subject) {
      setChapters([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      logger.log('🔍 Fetching chapters:', { batch: batchId, subject });

      const { data, error: apiError } = await chaptersAPI.getByBatch(batchId, subject);

      if (apiError) {
        throw new Error(apiError.message);
      }

      setChapters((data || []) as Chapter[]);
      logger.log(`✅ Loaded ${data?.length || 0} chapters`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load chapters';
      logger.error('Error in useChapters:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [batchId, subject]);

  const refetch = useCallback(async () => {
    chaptersAPI.invalidateCache();
    await fetchChapters();
  }, [fetchChapters]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  return { chapters, isLoading, error, refetch };
};

/**
 * Hook for fetching chapters with topic counts
 */
export const useChaptersWithTopics = (
  batchId: string | null,
  subject: string | null
) => {
  const [chapters, setChapters] = useState<(Chapter & { topics_count: number })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    if (!batchId || !subject) {
      setChapters([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: apiError } = await chaptersAPI.getWithTopicsCount(batchId, subject);

      if (apiError) {
        throw new Error(apiError.message);
      }

      setChapters((data || []) as (Chapter & { topics_count: number })[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chapters');
    } finally {
      setIsLoading(false);
    }
  }, [batchId, subject]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  return { chapters, isLoading, error, refetch: fetchChapters };
};
