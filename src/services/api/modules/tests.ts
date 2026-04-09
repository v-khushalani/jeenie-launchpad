/**
 * Tests API Module
 * 
 * Handles all test-related API operations
 */

import { apiClient } from '../apiClient';
import { cache, CACHE_TTL, CACHE_TAGS } from '../cache';
import { questionsAPI } from './questions';
import { logger } from '@/utils/logger';
import type { TestSession, Question, ApiResponse, PaginatedResponse } from '../types';

const PENDING_TEST_SYNC_KEY = 'pendingTestSyncs';

export interface TestConfig {
  title: string;
  testType: 'practice' | 'chapter' | 'full_length' | 'custom';
  questionCount: number;
  timeLimit?: number; // in minutes
  filters?: {
    subject?: string;
    chapter_id?: string;
    topic_id?: string;
    difficulty?: string;
  };
}

export interface TestResult {
  session: TestSession;
  questions: Question[];
  answers: Record<string, {
    selectedOption: string | null;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

export interface PendingTestAttempt {
  user_id: string;
  question_id: string;
  selected_option: string;
  is_correct: boolean;
  time_spent: number;
}

export interface PendingTestSyncPayload {
  id: string;
  userId: string;
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  totalTime: number;
  attemptedQuestions?: number;
  groupTestId?: string;
  sessionId?: string | null;
  attempts: PendingTestAttempt[];
  createdAt: string;
}

const readPendingTestSyncs = (): PendingTestSyncPayload[] => {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(PENDING_TEST_SYNC_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as PendingTestSyncPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writePendingTestSyncs = (items: PendingTestSyncPayload[]): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PENDING_TEST_SYNC_KEY, JSON.stringify(items.slice(0, 20)));
};

export const testsAPI = {
  queuePendingTestSync(payload: Omit<PendingTestSyncPayload, 'id' | 'createdAt'>): void {
    try {
      const existing = readPendingTestSyncs();
      const nextItem: PendingTestSyncPayload = {
        ...payload,
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      };

      const deduped = existing.filter((item) => {
        if (payload.sessionId && item.sessionId) return item.sessionId !== payload.sessionId;
        return item.subject !== payload.subject || item.userId !== payload.userId || item.createdAt !== nextItem.createdAt;
      });

      writePendingTestSyncs([nextItem, ...deduped]);
    } catch (error) {
      logger.error('Failed to queue pending test sync:', error);
    }
  },

  getPendingTestSyncCount(): number {
    return readPendingTestSyncs().length;
  },

  async flushPendingTestSyncs(targetUserId?: string): Promise<{ synced: number; remaining: number }> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { synced: 0, remaining: readPendingTestSyncs().length };
    }

    const items = readPendingTestSyncs();
    if (items.length === 0) return { synced: 0, remaining: 0 };

    let synced = 0;
    const remaining: PendingTestSyncPayload[] = [];

    for (const item of items) {
      if (targetUserId && item.userId !== targetUserId) {
        remaining.push(item);
        continue;
      }

      try {
        const sessionResult = await testsAPI.saveTestSessionLegacy(
          item.userId,
          item.subject,
          item.totalQuestions,
          item.correctAnswers,
          item.totalTime,
          item.attemptedQuestions,
          item.groupTestId,
          item.sessionId || undefined,
        );

        if (sessionResult.error || !sessionResult.data?.id) {
          remaining.push(item);
          continue;
        }

        if (item.attempts.length > 0) {
          const attemptsResult = await apiClient.rawClient
            .from('test_attempts')
            .insert(
              item.attempts.map((attempt) => ({
                ...attempt,
                session_id: sessionResult.data.id,
              }))
            );
          const { error } = attemptsResult;

          if (error) {
            remaining.push({ ...item, sessionId: sessionResult.data.id });
            continue;
          }
        }

        synced += 1;
      } catch {
        remaining.push(item);
      }
    }

    writePendingTestSyncs(remaining);
    return { synced, remaining: remaining.length };
  },

  /**
   * Reserve a test session when the user starts a test.
   * This creates the canonical row that monthly limits and history should count.
   */
  async reserveTestSessionLegacy(
    userId: string,
    subject: string,
    totalQuestions: number,
    title: string,
    questionIds: string[],
    groupTestId?: string
  ): Promise<ApiResponse<{ id: string }>> {
    try {
      const startedAt = new Date().toISOString();
      const { data, error } = await apiClient.rawClient
        .from('test_sessions')
        .insert([{
          user_id: userId,
          subject,
          title,
          total_questions: totalQuestions,
          attempted_questions: 0,
          correct_answers: 0,
          time_taken: 0,
          score: 0,
          accuracy: 0,
          status: 'in_progress',
          started_at: startedAt,
          group_test_id: groupTestId || null,
          question_ids: questionIds,
        }])
        .select('id')
        .single();

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      if (questionIds.length > 0) {
        await (apiClient.rawClient as unknown as {
          from: (table: string) => {
            insert: (rows: unknown) => Promise<unknown>
          }
        })
          .from('test_session_questions')
          .insert(
            questionIds.map((questionId, index) => ({
              session_id: data.id,
              question_id: questionId,
              question_order: index + 1,
            }))
          );
      }

      cache.invalidateByTag(CACHE_TAGS.TESTS);

      return { data: { id: data.id }, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'ERROR' },
      };
    }
  },

  /**
   * Create a new test session
   */
  async createTest(
    userId: string,
    batchId: string | null,
    config: TestConfig
  ): Promise<ApiResponse<{ session: TestSession; questions: Question[] }>> {
    try {
      // Get random questions based on config
      const { data: questions, error: questionsError } = await questionsAPI.getRandom(
        config.questionCount,
        config.filters || {}
      );

      if (questionsError || !questions || questions.length === 0) {
        return {
          data: null,
          error: questionsError || { message: 'No questions found', code: 'NO_QUESTIONS' },
        };
      }

      // Create test session
      const { data: session, error } = await apiClient.rawClient
        .from('test_sessions')
        .insert({
          user_id: userId,
          batch_id: batchId,
          test_type: config.testType,
          title: config.title,
          total_questions: questions.length,
          attempted_questions: 0,
          correct_answers: 0,
          score: 0,
          time_taken: 0,
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      // Link questions to session
      // Note: test_session_questions table may not be in generated types
      await (apiClient.rawClient as unknown as { from: (table: string) => { insert: (data: unknown) => Promise<void> } })
        .from('test_session_questions')
        .insert(
          questions.map((q, index) => ({
            session_id: session.id,
            question_id: q.id,
            question_order: index + 1,
          }))
        );

      // Cache the test session questions for quick access during test
      cache.set(
        `test:${session.id}:questions`,
        questions,
        CACHE_TTL.VERY_LONG,
        [CACHE_TAGS.TESTS]
      );

      return {
        data: {
          session: session as unknown as TestSession,
          questions,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'ERROR' },
      };
    }
  },

  /**
   * Get test session with questions
   */
  async getTestSession(sessionId: string): Promise<ApiResponse<TestResult>> {
    const cacheKey = `test:session:${sessionId}`;
    const cached = cache.get<TestResult>(cacheKey);
    if (cached) {
      return { data: cached, error: null };
    }

    try {
      // Get session
      const { data: session, error: sessionError } = await apiClient.rawClient
        .from('test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        return { data: null, error: { message: sessionError.message, code: sessionError.code } };
      }

      // Get questions from cache or DB
      let questions = cache.get<Question[]>(`test:${sessionId}:questions`);
      
      if (!questions) {
        // test_session_questions may not be in generated types
        const { data: sessionQuestions } = await (apiClient.rawClient as unknown as { 
          from: (table: string) => { 
            select: (cols: string) => { 
              eq: (col: string, val: string) => { 
                order: (col: string, opts: { ascending: boolean }) => Promise<{ data: { question_id: string; question_order: number }[] }> 
              } 
            } 
          } 
        })
          .from('test_session_questions')
          .select('question_id, question_order')
          .eq('session_id', sessionId)
          .order('question_order', { ascending: true });

        if (sessionQuestions && sessionQuestions.length > 0) {
          const questionIds = sessionQuestions.map(sq => sq.question_id);
          const { data: fetchedQuestions } = await questionsAPI.getByIds(questionIds);
          
          // Maintain order
          const questionMap = new Map(fetchedQuestions?.map(q => [q.id, q]) || []);
          questions = sessionQuestions
            .map(sq => questionMap.get(sq.question_id))
            .filter((q): q is Question => q !== undefined);
        }
      }

      // Get answers - test_session_answers may not be in generated types
      const { data: answers } = await (apiClient.rawClient as unknown as { 
        from: (table: string) => { 
          select: (cols: string) => { 
            eq: (col: string, val: string) => Promise<{ data: { question_id: string; selected_option: string; is_correct: boolean; time_spent: number }[] }> 
          } 
        } 
      })
        .from('test_session_answers')
        .select('question_id, selected_option, is_correct, time_spent')
        .eq('session_id', sessionId);

      const answersMap: TestResult['answers'] = {};
      (answers || []).forEach(a => {
        answersMap[a.question_id] = {
          selectedOption: a.selected_option,
          isCorrect: a.is_correct,
          timeSpent: a.time_spent,
        };
      });

      const result: TestResult = {
        session: session as unknown as TestSession,
        questions: questions || [],
        answers: answersMap,
      };

      // Only cache completed tests
      if (session.status === 'completed') {
        cache.set(cacheKey, result, CACHE_TTL.LONG, [CACHE_TAGS.TESTS]);
      }

      return { data: result, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'ERROR' },
      };
    }
  },

  /**
   * Submit answer for a question
   */
  async submitAnswer(
    sessionId: string,
    questionId: string,
    selectedOption: string,
    timeSpent: number
  ): Promise<ApiResponse<{ isCorrect: boolean; pointsEarned: number }>> {
    try {
      // Get the correct answer
      const { data: question } = await questionsAPI.getById(questionId);
      if (!question) {
        return { data: null, error: { message: 'Question not found', code: 'NOT_FOUND' } };
      }

      const isCorrect = selectedOption === question.correct_option;
      const pointsEarned = isCorrect ? 10 : 0; // Base points

      // Save answer - test_session_answers may not be in generated types
      await (apiClient.rawClient as unknown as {
        from: (table: string) => {
          upsert: (data: unknown) => Promise<void>
        }
      })
        .from('test_session_answers')
        .upsert({
          session_id: sessionId,
          question_id: questionId,
          selected_option: selectedOption,
          is_correct: isCorrect,
          time_spent: timeSpent,
          points_earned: pointsEarned,
        });

      // Update session stats
      const { data: currentSession } = await apiClient.rawClient
        .from('test_sessions')
        .select('attempted_questions, correct_answers, time_taken')
        .eq('id', sessionId)
        .single();

      if (currentSession) {
        await apiClient.rawClient
          .from('test_sessions')
          .update({
            attempted_questions: currentSession.attempted_questions + 1,
            correct_answers: currentSession.correct_answers + (isCorrect ? 1 : 0),
            time_taken: currentSession.time_taken + timeSpent,
          })
          .eq('id', sessionId);
      }

      return {
        data: { isCorrect, pointsEarned },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'ERROR' },
      };
    }
  },

  /**
   * Complete test session
   */
  async completeTest(sessionId: string): Promise<ApiResponse<TestSession>> {
    try {
      // Get final stats
      const { data: session, error: sessionError } = await apiClient.rawClient
        .from('test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        return { data: null, error: { message: sessionError.message, code: sessionError.code } };
      }

      // Calculate score
      const score = session.total_questions > 0
        ? Math.round((session.correct_answers / session.total_questions) * 100)
        : 0;

      // Update session
      const { data: updated, error } = await apiClient.rawClient
        .from('test_sessions')
        .update({
          status: 'completed',
          score,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      // Invalidate cache
      cache.delete(`test:session:${sessionId}`);
      cache.delete(`test:${sessionId}:questions`);

      return { data: updated as unknown as TestSession, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'ERROR' },
      };
    }
  },

  /**
   * Get user's test history (paginated)
   */
  async getUserTests(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<TestSession>> {
    return apiClient.fetchPaginated('test_sessions', {
      page,
      pageSize,
      filters: { user_id: userId, status: 'completed' } as Record<string, unknown>,
      orderBy: 'completed_at',
      orderDirection: 'desc',
      cacheTTL: CACHE_TTL.SHORT,
      cacheTags: [CACHE_TAGS.TESTS],
    }) as unknown as Promise<PaginatedResponse<TestSession>>;
  },

  /**
   * Get test statistics
   */
  async getTestStats(userId: string): Promise<ApiResponse<{
    totalTests: number;
    averageScore: number;
    totalTime: number;
    bestScore: number;
    recentTrend: number[];
  }>> {
    const cacheKey = `test:stats:${userId}`;
    const cached = cache.get<{
      totalTests: number;
      averageScore: number;
      totalTime: number;
      bestScore: number;
      recentTrend: number[];
    }>(cacheKey);
    if (cached) {
      return { data: cached, error: null };
    }

    try {
      const { data: tests } = await apiClient.rawClient
        .from('test_sessions')
        .select('score, time_taken')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(100);

      if (!tests || tests.length === 0) {
        return {
          data: {
            totalTests: 0,
            averageScore: 0,
            totalTime: 0,
            bestScore: 0,
            recentTrend: [],
          },
          error: null,
        };
      }

      const scores = tests.map(t => t.score);
      const stats = {
        totalTests: tests.length,
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        totalTime: tests.reduce((a, t) => a + t.time_taken, 0),
        bestScore: Math.max(...scores),
        recentTrend: scores.slice(0, 10).reverse(), // Last 10 scores
      };

      cache.set(cacheKey, stats, CACHE_TTL.SHORT, [CACHE_TAGS.TESTS]);

      return { data: stats, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'ERROR' },
      };
    }
  },

  /**
   * Invalidate tests cache
   */
  invalidateCache(): void {
    cache.invalidateByTag(CACHE_TAGS.TESTS);
  },

  /**
   * Legacy: Validate answer via RPC (for backward compatibility)
   */
  async validateAnswerLegacy(
    questionId: string,
    selectedOption: string
  ): Promise<ApiResponse<{ isCorrect: boolean }>> {
    try {
      const { data, error } = await apiClient.rawClient.rpc('validate_question_answer', {
        p_question_id: questionId,
        p_selected_option: selectedOption
      });

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      return { data: { isCorrect: !!data }, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'ERROR' },
      };
    }
  },

  /**
   * Legacy: Save test session directly (for backward compatibility)
   */
  async saveTestSessionLegacy(
    userId: string,
    subject: string,
    totalQuestions: number,
    correctAnswers: number,
    totalTime: number,
    attemptedQuestions?: number,
    groupTestId?: string,
    sessionId?: string
  ): Promise<ApiResponse<{ id: string }>> {
    try {
      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      const accuracyVal = attemptedQuestions && attemptedQuestions > 0 ? Math.round((correctAnswers / attemptedQuestions) * 100) : 0;

      if (sessionId) {
        const { data, error } = await apiClient.rawClient
          .from('test_sessions')
          .update({
            user_id: userId,
            subject,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            attempted_questions: attemptedQuestions ?? correctAnswers,
            time_taken: totalTime,
            score,
            accuracy: accuracyVal,
            status: 'completed',
            completed_at: new Date().toISOString(),
            group_test_id: groupTestId || null,
          })
          .eq('id', sessionId)
          .select('id')
          .single();

        if (error) {
          return { data: null, error: { message: error.message, code: error.code } };
        }

        cache.invalidateByTag(CACHE_TAGS.TESTS);

        return { data: { id: data.id }, error: null };
      }

      const { data, error } = await apiClient.rawClient
        .from('test_sessions')
        .insert([{
          user_id: userId,
          subject: subject,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          attempted_questions: attemptedQuestions ?? correctAnswers,
          time_taken: totalTime,
          score: score,
          accuracy: accuracyVal,
          status: 'completed',
          completed_at: new Date().toISOString(),
          group_test_id: groupTestId || null,
        }])
        .select('id')
        .single();

      if (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }

      // Invalidate cache
      cache.invalidateByTag(CACHE_TAGS.TESTS);

      return { data: { id: data.id }, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: (error as Error).message, code: 'ERROR' },
      };
    }
  },
};
