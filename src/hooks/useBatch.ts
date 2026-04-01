/**
 * useBatch Hook (Enterprise Grade)
 * 
 * Uses the new API service layer with caching
 */

import { useState, useEffect, useCallback } from 'react';
import { batchesAPI } from '@/services/api/modules/batches';
import type { BatchWithSubjects } from '@/services/api/types';
import { logger } from '@/utils/logger';

export interface Batch {
  id: string;
  name: string;
  grade: number;
  exam_type: string;
  subjects: string[];
}

interface StudentProfile {
  grade: number;
  target_exam: string;
}

export const useBatch = (profile: StudentProfile | null) => {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    if (!profile?.grade || !profile?.target_exam) {
      setBatch(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      logger.log('🔍 Fetching batch:', {
        grade: profile.grade,
        exam: profile.target_exam,
      });

      const { data, error: apiError } = await batchesAPI.getByGradeAndExam(
        profile.grade,
        profile.target_exam
      );

      if (apiError) {
        throw new Error(apiError.message);
      }

      if (data) {
        setBatch({
          id: data.id,
          name: data.name,
          grade: data.grade,
          exam_type: data.exam_type,
          subjects: data.subjects,
        });
        logger.log('✅ Batch loaded:', data.name);
      } else {
        // Auto-create batch if not found
        logger.log('⚠️ No batch found, creating...');
        const defaultSubjects = profile.target_exam === 'NEET' 
          ? ['Physics', 'Chemistry', 'Biology']
          : ['Physics', 'Chemistry', 'Mathematics'];

        const { data: newBatch, error: createError } = await batchesAPI.ensureBatch(
          profile.grade,
          profile.target_exam.startsWith('Foundation') ? 'Foundation' : profile.target_exam,
          defaultSubjects
        );

        if (createError) {
          throw new Error(createError.message);
        }

        if (newBatch) {
          setBatch({
            id: newBatch.id,
            name: newBatch.name,
            grade: newBatch.grade,
            exam_type: newBatch.exam_type,
            subjects: newBatch.subjects,
          });
          logger.log('✅ Batch created:', newBatch.name);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load batch';
      logger.error('Error in useBatch:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.grade, profile?.target_exam]);

  const refetch = useCallback(async () => {
    batchesAPI.invalidateCache();
    await fetchBatch();
  }, [fetchBatch]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  return { batch, isLoading, error, refetch };
};

/**
 * Hook for fetching all active batches
 */
export const useAllBatches = () => {
  const [batches, setBatches] = useState<BatchWithSubjects[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: apiError } = await batchesAPI.getAllActive();

      if (apiError) {
        throw new Error(apiError.message);
      }

      setBatches(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  return { batches, isLoading, error, refetch: fetchBatches };
};
