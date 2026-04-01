import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import { fetchAllPaginated } from '@/utils/supabasePagination';

/** Mapped question shape for the UI (fields renamed from DB columns) */
export interface Question {
  id: string;
  question_text: string;
  options: Record<string, string>;
  correct_option: string;
  explanation: string;
  subject: string;
  topic: string;
  difficulty_level: number;
  chapter: string;
  exam?: string;
}

// Re-export QuestionAttempt from canonical type file
export type { QuestionAttempt } from '@/types/api';


export const useQuestions = (filters?: {
  subject?: string;
  topic?: string;
  difficulty?: number;
  limit?: number;
  exam?: string;
}) => {
  const { user, isAuthenticated } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { supabase } = await import('@/integrations/supabase/client');
      
      let query = supabase
        .from('questions')
        .select('*');

      // Apply exam filter (required)
      if (filters?.exam) {
        query = query.eq('exam', filters.exam);
      }

      // Apply filters
      if (filters?.subject) {
        query = query.eq('subject', filters.subject);
      }

      if (filters?.topic) {
        query = query.eq('topic', filters.topic);
      }

      if (filters?.difficulty) {
        const difficultyMap: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
        query = query.eq('difficulty', difficultyMap[filters.difficulty] || 'Medium');
      }

      // Apply limit
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error: queryError } = await query as { data: any[], error: any };

      if (queryError) throw queryError;

      // Map database columns to expected format
      const mappedQuestions: Question[] = (data || []).map(q => ({
        id: q.id,
        question_text: q.question,
        options: {
          A: q.option_a,
          B: q.option_b,
          C: q.option_c,
          D: q.option_d
        },
        correct_option: '', // Hidden by RLS
        explanation: '', // Hidden by RLS
        subject: q.subject,
        topic: q.topic,
        difficulty_level: q.difficulty === 'Easy' ? 1 : q.difficulty === 'Hard' ? 3 : 2,
        chapter: q.chapter
      }));

      setQuestions(mappedQuestions);
    } catch (err) {
      logger.error('Error fetching questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

const getRandomQuestions = async (
  subject?: string | null, 
  topic?: string | null, 
  difficulty?: number | null, 
  count: number = 10
) => {
  try {
    setLoading(true);
    setError(null);

    const { supabase } = await import('@/integrations/supabase/client');
    
    // For adaptive learning, only exclude questions attempted at THIS difficulty level
    if (isAuthenticated && user) {
      // Parallel: profile + attempted IDs
      const [profileResult, attemptedAtLevel, testAttempted] = await Promise.all([
        supabase
          .from('profiles')
          .select('target_exam')
          .eq('id', user.id)
          .single(),
        fetchAllPaginated(() =>
          supabase.from('question_attempts').select('question_id').eq('user_id', user.id)
        ),
        fetchAllPaginated(() =>
          supabase.from('test_attempts').select('question_id').eq('user_id', user.id)
        )
      ]);
      
      const targetExam = profileResult.data?.target_exam || 'JEE';

      let query = supabase
        .from('questions')
        .select('*')
        .eq('exam', targetExam);

      // Apply filters
      if (subject) {
        query = query.eq('subject', subject);
      }

      if (topic) {
        query = query.eq('topic', topic);
      }

      if (difficulty) {
        const difficultyMap: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
        const targetDifficulty = difficultyMap[difficulty] || 'Medium';
        query = query.eq('difficulty', targetDifficulty);
      }
      
      const attemptedIds = [
        ...new Set([
          ...(attemptedAtLevel?.map(a => a.question_id) || []),
          ...(testAttempted?.map(a => a.question_id) || [])
        ])
      ];
      
      if (attemptedIds.length > 0) {
        query = query.not('id', 'in', `(${attemptedIds.join(',')})`);
      }

      // Fetch more than needed for random selection
      query = query.limit(count * 3);

      const { data, error: queryError } = await query as { data: any[], error: any };

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        setError('No new questions available at this level!');
        return [];
      }

      // Map and shuffle
      const mappedQuestions: Question[] = (data || []).map(q => ({
        id: q.id,
        question_text: q.question,
        options: {
          A: q.option_a,
          B: q.option_b,
          C: q.option_c,
          D: q.option_d
        },
        correct_option: '', // Hidden by RLS
        explanation: '', // Hidden by RLS
        subject: q.subject,
        topic: q.topic,
        difficulty_level: q.difficulty === 'Easy' ? 1 : q.difficulty === 'Hard' ? 3 : 2,
        chapter: q.chapter
      }));

      // Shuffle and take count
      const shuffled = mappedQuestions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));

      setQuestions(selected);
      return selected;
    }
    
    return [];
  } catch (err) {
    logger.error('Error fetching random questions:', err);
    setError(err instanceof Error ? err.message : 'Failed to fetch questions');
    return [];
  } finally {
    setLoading(false);
  }
};
  
  const submitAnswer = async (
    questionId: string,
    selectedAnswer: string,
    timeSpent?: number
  ): Promise<{ isCorrect: boolean; correctAnswer: string; explanation?: string }> => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    try {
      // Use secure server-side validation function
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.rpc('validate_question_answer', {
        p_question_id: questionId,
        p_selected_option: selectedAnswer
      });

      if (error) {
        logger.error('Error validating answer:', error);
        throw new Error('Failed to validate answer');
      }

      // Type cast the response data - RPC returns array
      const typedResult = ((data as any)?.[0] || data) as {
        attempt_id: string;
        is_correct: boolean;
        correct_option: string;
        explanation: string;
      };

      return { 
        isCorrect: typedResult.is_correct,
        correctAnswer: typedResult.correct_option,
        explanation: typedResult.explanation
      };
    } catch (err) {
      logger.error('Error submitting answer:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (filters) {
      fetchQuestions();
    }
  }, [filters, fetchQuestions]);

  return {
    questions,
    loading,
    error,
    fetchQuestions,
    getRandomQuestions,
    submitAnswer,
    refetch: fetchQuestions
  };
};
