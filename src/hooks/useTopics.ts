/**
 * useTopics Hook (Enterprise Grade)
 * 
 * Uses the new API service layer with caching
 */

import { useState, useEffect, useCallback } from 'react';
import { topicsAPI } from '@/services/api/modules/topics';
import type { Topic as APITopic } from '@/services/api/types';
import { logger } from '@/utils/logger';

export interface Topic {
  id: string;
  chapter_id: string | null;
  topic_number: number | null;
  topic_name: string;
  description?: string | null;
}

export const useTopics = (chapterId: string | null) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    if (!chapterId) {
      setTopics([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      logger.log('🔍 Fetching topics for chapter:', chapterId);

      const { data, error: apiError } = await topicsAPI.getByChapter(chapterId);

      if (apiError) {
        throw new Error(apiError.message);
      }

      setTopics((data || []) as Topic[]);
      logger.log(`✅ Loaded ${data?.length || 0} topics`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load topics';
      logger.error('Error in useTopics:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [chapterId]);

  const refetch = useCallback(async () => {
    topicsAPI.invalidateCache();
    await fetchTopics();
  }, [fetchTopics]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return { topics, isLoading, error, refetch };
};

/**
 * Hook for fetching topics with question counts
 */
export const useTopicsWithQuestions = (chapterId: string | null) => {
  const [topics, setTopics] = useState<(Topic & { questions_count: number })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    if (!chapterId) {
      setTopics([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: apiError } = await topicsAPI.getWithQuestionsCount(chapterId);

      if (apiError) {
        throw new Error(apiError.message);
      }

      setTopics((data || []) as (Topic & { questions_count: number })[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load topics');
    } finally {
      setIsLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return { topics, isLoading, error, refetch: fetchTopics };
};
