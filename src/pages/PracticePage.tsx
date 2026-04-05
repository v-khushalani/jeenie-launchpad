import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchAllPaginated } from '@/utils/supabasePagination';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2,
  Target, Trophy, BookOpen, RotateCcw, Zap, Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MathDisplay } from '@/components/admin/MathDisplay';
import { logger } from '@/utils/logger';
import { QuestionReportDialog, ReportButton } from '@/components/QuestionReportDialog';
import { UserLimitsService } from '@/services/userLimitsService';
import 'katex/dist/katex.min.css';

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  difficulty?: string;
  topic?: string;
  topic_id?: string;
  chapter?: string;
  subject?: string;
}

interface AnswerRecord {
  selectedOption: string;
  isCorrect: boolean;
  correctOption: string;
  explanation: string;
}

const OPTIONS = ['A', 'B', 'C', 'D'] as const;
const QUESTIONS_PER_BATCH = 20;
const AUTO_ADVANCE_DELAY = 800;

// ── ELO-inspired adaptive difficulty ──
const DIFFICULTY_THRESHOLDS = { easy: 30, hard: 65 } as const;
const SCORE_DELTAS: Record<string, { correct: number; wrong: number }> = {
  Easy:   { correct: 5,  wrong: -15 },
  Medium: { correct: 10, wrong: -10 },
  Hard:   { correct: 15, wrong: -5 },
};

function getDifficultyFromScore(score: number): string {
  if (score < DIFFICULTY_THRESHOLDS.easy) return 'Easy';
  if (score > DIFFICULTY_THRESHOLDS.hard) return 'Hard';
  return 'Medium';
}

function getPointsDelta(difficulty: string | undefined, isCorrect: boolean): number {
  if (!isCorrect) return -2;
  const d = (difficulty || 'medium').toUpperCase();
  if (d === 'EASY') return 5;
  if (d === 'HARD') return 15;
  return 10;
}

const PracticePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const subject = searchParams.get('subject') || '';
  const chapter = searchParams.get('chapter') || '';
  const chapterId = searchParams.get('chapter_id') || '';
  const topicId = searchParams.get('topic_id') || '';
  const topicName = searchParams.get('topic') || '';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });

  // Daily limit state
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [dailyRemaining, setDailyRemaining] = useState<number>(Infinity);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(15);

  // Per-question answer storage
  const [answeredQuestions, setAnsweredQuestions] = useState<Map<number, AnswerRecord>>(new Map());

  // Adaptive difficulty — ELO score
  const [difficultyScore, setDifficultyScore] = useState(15);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const currentDifficulty = getDifficultyFromScore(difficultyScore);

  // Auto-advance
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reportingQuestionId, setReportingQuestionId] = useState<string | null>(null);

  const currentAnswer = answeredQuestions.get(currentIndex) || null;
  const isCurrentAnswered = currentAnswer !== null;

  // Check daily limit on mount and after each answer
  const checkDailyLimit = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = await UserLimitsService.canSolveMore(user.id);
      setDailyLimitReached(!result.canSolve);
      setDailyRemaining(result.remaining);
      setDailyUsed(result.used);
      setDailyLimit(result.limit === Infinity ? 999 : result.limit);
    } catch (e) {
      logger.error('Error checking daily limit:', e);
    }
  }, [user?.id]);

  useEffect(() => { checkDailyLimit(); }, [checkDailyLimit]);

  const fetchQuestions = useCallback(async (difficulty?: string) => {
    setLoading(true);
    try {
      const attemptedIds = new Set<string>();
      if (user?.id) {
        const [practiceIds, testIds] = await Promise.all([
          fetchAllPaginated(() =>
            supabase.from('question_attempts').select('question_id').eq('user_id', user.id)
          ),
          fetchAllPaginated(() =>
            supabase.from('test_attempts').select('question_id').eq('user_id', user.id)
          ),
        ]);
        practiceIds.forEach((r: any) => attemptedIds.add(r.question_id));
        testIds.forEach((r: any) => attemptedIds.add(r.question_id));
      }

      // Get user's batch to filter questions by exam type
      let userBatchIds: string[] = [];
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('target_exam, grade')
          .eq('id', user.id)
          .single();
        
        if (profile?.target_exam) {
          const { data: batches } = await supabase
            .from('batches')
            .select('id')
            .eq('exam_type', profile.target_exam)
            .eq('is_active', true);
          userBatchIds = (batches || []).map(b => b.id);
        }
      }

      let query = supabase
        .from('questions_public')
        .select('id, question, option_a, option_b, option_c, option_d, difficulty, topic, topic_id, chapter, subject')
        .eq('is_active', true);

      if (topicId) query = query.eq('topic_id', topicId);
      else if (chapterId) query = query.eq('chapter_id', chapterId);
      else if (subject) query = query.ilike('subject', subject);

      // Filter by user's batch so JEE students don't see NEET questions
      if (userBatchIds.length > 0 && !topicId && !chapterId) {
        query = query.in('batch_id', userBatchIds);
      }

      const targetDiff = difficulty || currentDifficulty;
      if (targetDiff) query = query.eq('difficulty', targetDiff);

      const { data, error } = await query.limit(100);
      if (error) throw error;

      let pool = (data || []).filter(q => !attemptedIds.has(q.id));

      // If not enough fresh questions at this difficulty, try ALL difficulties
      if (pool.length < 5) {
        let fallbackQuery = supabase
          .from('questions_public')
          .select('id, question, option_a, option_b, option_c, option_d, difficulty, topic, topic_id, chapter, subject')
          .eq('is_active', true);
        if (topicId) fallbackQuery = fallbackQuery.eq('topic_id', topicId);
        else if (chapterId) fallbackQuery = fallbackQuery.eq('chapter_id', chapterId);
        else if (subject) fallbackQuery = fallbackQuery.ilike('subject', subject);

        if (userBatchIds.length > 0 && !topicId && !chapterId) {
          fallbackQuery = fallbackQuery.in('batch_id', userBatchIds);
        }

        const { data: fallbackData } = await fallbackQuery.limit(200);
        const fallbackFresh = (fallbackData || []).filter(q => !attemptedIds.has(q.id));
        pool = fallbackFresh;
      }

      if (pool.length === 0) {
        toast.success('You\'ve completed all questions in this section! 🎉 Try another topic.');
        setQuestions([]);
        setLoading(false);
        return;
      }

      const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_BATCH);
      setQuestions(shuffled);
    } catch (error) {
      logger.error('Failed to fetch practice questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [subject, chapterId, topicId, user?.id, currentDifficulty]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  useEffect(() => {
    return () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current); };
  }, []);

  const cancelAutoAdvance = () => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  };

  const startAutoAdvance = () => {
    autoAdvanceTimer.current = setTimeout(() => {
      handleNext();
    }, AUTO_ADVANCE_DELAY);
  };

  // Sync daily_progress table after each answer
  const syncDailyProgress = async (isCorrect: boolean, pointsDelta: number) => {
    if (!user?.id) return;
    try {
      // Use IST date to align with Indian students' day boundary
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const today = new Date(now.getTime() + istOffset).toISOString().split('T')[0];
      
      // Use a list query and pick first row to avoid 406 object errors on 0/multi-row states
      const { data: progressRows } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('updated_at', { ascending: false })
        .limit(1);
      const existing = progressRows?.[0] || null;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('daily_goal')
        .eq('id', user.id)
        .single();

      const dailyGoal = profileData?.daily_goal || 15;

      if (existing) {
        const newCompleted = (existing.questions_completed || 0) + 1;
        const newCorrect = (existing.questions_correct || 0) + (isCorrect ? 1 : 0);
        const newAttempted = (existing.questions_attempted || 0) + 1;
        const newPoints = (existing.points_earned || 0) + Math.max(0, pointsDelta);

        await supabase
          .from('daily_progress')
          .update({
            questions_completed: newCompleted,
            questions_correct: newCorrect,
            questions_attempted: newAttempted,
            points_earned: newPoints,
            daily_target: dailyGoal,
            target_met: newCompleted >= dailyGoal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('daily_progress')
          .insert({
            user_id: user.id,
            date: today,
            questions_completed: 1,
            questions_correct: isCorrect ? 1 : 0,
            questions_attempted: 1,
            points_earned: Math.max(0, pointsDelta),
            daily_target: dailyGoal,
            target_met: 1 >= dailyGoal,
          });
      }
    } catch (e) {
      logger.error('Error syncing daily progress:', e);
    }
  };

  const handleOptionSelect = async (option: string) => {
    if (isCurrentAnswered || !user || isValidating) return;

    // Check daily limit before allowing answer
    if (dailyLimitReached) {
      toast.error('Daily limit reached! Upgrade to Pro for unlimited questions.');
      return;
    }

    setIsValidating(true);
    cancelAutoAdvance();

    try {
      const currentQuestion = questions[currentIndex];
      const { data: rpcData } = await supabase.rpc('validate_question_answer', {
        p_question_id: currentQuestion.id,
        p_selected_option: option,
      });

      const result = rpcData as { is_correct: boolean; correct_option: string; explanation?: string } | null;

      if (result) {
        const explanation = result.explanation || 'No explanation available.';
        const record: AnswerRecord = {
          selectedOption: option,
          isCorrect: result.is_correct,
          correctOption: result.correct_option,
          explanation,
        };

        setAnsweredQuestions(prev => new Map(prev).set(currentIndex, record));

        setStats(prev => ({
          correct: prev.correct + (result.is_correct ? 1 : 0),
          wrong: prev.wrong + (result.is_correct ? 0 : 1),
          total: prev.total + 1,
        }));

        // ── ELO-inspired adaptive scoring ──
        const qDiff = currentQuestion.difficulty || 'Medium';
        const deltas = SCORE_DELTAS[qDiff] || SCORE_DELTAS.Medium;
        let scoreDelta = result.is_correct ? deltas.correct : deltas.wrong;

        const newConsecutive = result.is_correct ? consecutiveCorrect + 1 : 0;
        setConsecutiveCorrect(newConsecutive);
        if (result.is_correct && newConsecutive >= 5) {
          scoreDelta = Math.round(scoreDelta * 1.5);
        }

        const newScore = Math.max(0, Math.min(100, difficultyScore + scoreDelta));
        const oldDiff = getDifficultyFromScore(difficultyScore);
        const newDiff = getDifficultyFromScore(newScore);
        setDifficultyScore(newScore);

        if (newDiff !== oldDiff) {
          const isUp = newScore > difficultyScore - scoreDelta;
          toast(isUp ? `Level up → ${newDiff} 🔥` : `Adjusting → ${newDiff}`, { duration: 1500 });
        }

        // Insert attempt
        await supabase.from('question_attempts').insert({
          user_id: user.id,
          question_id: currentQuestion.id,
          selected_option: option,
          is_correct: result.is_correct,
          mode: 'practice',
          time_spent: 0,
        });

        // Fire-and-forget: update points, streak, topic mastery, daily progress
        const pointsDelta = getPointsDelta(currentQuestion.difficulty, result.is_correct);
        Promise.all([
          supabase.rpc('update_practice_stats', {
            p_user_id: user.id,
            p_points_delta: pointsDelta,
            p_is_correct: result.is_correct,
          }),
          supabase.rpc('update_streak_stats', { p_user_id: user.id }),
          currentQuestion.topic_id
            ? supabase.rpc('upsert_topic_mastery', {
                p_user_id: user.id,
                p_topic_id: currentQuestion.topic_id,
                p_subject: currentQuestion.subject || subject || '',
                p_chapter: currentQuestion.chapter || chapter || '',
                p_topic: currentQuestion.topic || topicName || '',
                p_is_correct: result.is_correct,
              })
            : Promise.resolve(),
          syncDailyProgress(result.is_correct, pointsDelta),
        ]).catch(e => {
          logger.error('Background stats update error:', e);
        });

        // Re-check daily limit after answering
        checkDailyLimit();

        // Auto-advance after answering
        startAutoAdvance();
      }
    } catch (error) {
      logger.error('Error validating answer:', error);
      toast.error('Failed to check answer');
    } finally {
      setIsValidating(false);
    }
  };

  const handleNext = () => {
    cancelAutoAdvance();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success(`Session complete! ${stats.correct}/${stats.total} correct`);
      setCurrentIndex(questions.length);
    }
  };

  const handlePrev = () => {
    cancelAutoAdvance();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const getOptionStyle = (option: string) => {
    const answer = currentAnswer;
    if (!answer) return 'border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer';
    const normalizedCorrect = answer.correctOption?.toUpperCase().replace('OPTION_', '') || '';
    if (option === normalizedCorrect) return 'border-green-500 bg-green-50 dark:bg-green-950/30 ring-2 ring-green-500/30';
    if (option === answer.selectedOption && !answer.isCorrect) return 'border-red-500 bg-red-50 dark:bg-red-950/30 ring-2 ring-red-500/30';
    return 'border-border opacity-50';
  };

  const getOptionCircleStyle = (option: string) => {
    const answer = currentAnswer;
    if (!answer) return 'border-muted-foreground/40';
    const normalizedCorrect = answer.correctOption?.toUpperCase().replace('OPTION_', '') || '';
    if (option === normalizedCorrect) return 'border-green-500 bg-green-500 text-white';
    if (option === answer.selectedOption && !answer.isCorrect) return 'border-red-500 bg-red-500 text-white';
    return 'border-muted-foreground/40';
  };

  const getOptionIcon = (option: string) => {
    const answer = currentAnswer;
    if (!answer) return null;
    const normalizedCorrect = answer.correctOption?.toUpperCase().replace('OPTION_', '') || '';
    if (option === normalizedCorrect) return <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />;
    if (option === answer.selectedOption && !answer.isCorrect) return <XCircle className="w-5 h-5 text-red-600 shrink-0" />;
    return null;
  };

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const currentQuestion = questions[currentIndex];
  const title = topicName || chapter || subject || 'Practice';

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="mobile-app-shell-bottom-nav bg-background flex items-center justify-center overflow-hidden">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Daily limit reached — show upgrade screen
  if (dailyLimitReached && questions.length > 0 && currentIndex < questions.length && !isCurrentAnswered) {
    return (
      <div className="mobile-app-shell-bottom-nav bg-background flex items-center justify-center p-4 overflow-hidden">
        <Card className="max-w-md w-full text-center p-8">
          <Lock className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Daily Limit Reached!</h2>
          <p className="text-muted-foreground mb-2">
            You've solved {dailyUsed} questions today. Free users get {dailyLimit}/day.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Upgrade to Pro for <strong>unlimited questions</strong> — just ₹1.37/day!
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90" onClick={() => navigate('/subscription')}>
              <Zap className="w-4 h-4 mr-2" /> Go Pro
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mobile-app-shell-bottom-nav bg-background flex items-center justify-center p-4 overflow-hidden">
        <Card className="max-w-md w-full text-center p-8">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Questions Available</h2>
          <p className="text-muted-foreground mb-6">No practice questions found for this selection.</p>
          <Button onClick={() => navigate('/study-now')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Study
          </Button>
        </Card>
      </div>
    );
  }

  if (currentIndex >= questions.length) {
    return (
      <div className="mobile-app-shell-bottom-nav bg-background flex items-center justify-center p-4 overflow-hidden">
        <Card className="max-w-md w-full text-center p-8">
          <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Practice Complete!</h2>
          <div className="grid grid-cols-3 gap-4 my-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
              <div className="text-xs text-muted-foreground">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.wrong}</div>
              <div className="text-xs text-muted-foreground">Wrong</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/study-now')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button className="flex-1" onClick={() => {
              setCurrentIndex(0);
              setStats({ correct: 0, wrong: 0, total: 0 });
              setAnsweredQuestions(new Map());
              setDifficultyScore(15);
              setConsecutiveCorrect(0);
              fetchQuestions();
            }}>
              <RotateCcw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mobile-app-shell-bottom-nav bg-background flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="container mx-auto max-w-3xl flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/study-now')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="text-center">
            <h1 className="text-sm font-bold text-primary truncate max-w-[200px]">{title}</h1>
            <p className="text-xs text-muted-foreground">Q {currentIndex + 1}/{questions.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${getDifficultyColor(currentDifficulty)}`}>
              <Zap className="w-3 h-3 mr-0.5" />{currentDifficulty}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Target className="w-3 h-3 mr-1" />{accuracy}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Daily limit warning banner */}
      {dailyRemaining <= 3 && dailyRemaining > 0 && !dailyLimitReached && (
        <div className="shrink-0 bg-amber-500/90 text-white text-center py-1.5 text-xs font-medium">
          ⚠️ Only {dailyRemaining} questions left today! <button onClick={() => navigate('/subscription')} className="underline font-bold">Go Pro →</button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="shrink-0 container mx-auto max-w-3xl px-4 pt-2">
        <div className="flex items-center justify-center gap-6 text-sm">
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <CheckCircle className="w-4 h-4" /> {stats.correct}
          </span>
          <span className="flex items-center gap-1 text-red-600 font-medium">
            <XCircle className="w-4 h-4" /> {stats.wrong}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            Total: {stats.total}
          </span>
        </div>
      </div>

      {/* Question Area — flex-1 with internal scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto container mx-auto max-w-3xl px-4 py-3">
        <Card className="mb-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Question {currentIndex + 1}</CardTitle>
              <div className="flex items-center gap-2">
                <ReportButton onClick={() => setReportingQuestionId(currentQuestion.id)} />
                {currentQuestion.difficulty && (
                  <Badge variant="outline" className={`text-xs capitalize ${getDifficultyColor(currentQuestion.difficulty)}`}>
                    {currentQuestion.difficulty}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm sm:text-base leading-relaxed mb-4">
              <MathDisplay text={currentQuestion.question} />
            </div>

            <div className="space-y-2">
              {OPTIONS.map(option => {
                const optionText = currentQuestion[`option_${option.toLowerCase()}` as keyof Question] as string;
                return (
                  <button
                    key={option}
                    onClick={() => handleOptionSelect(option)}
                    disabled={isCurrentAnswered || dailyLimitReached}
                    className={`w-full p-3 text-left rounded-xl border-2 transition-all duration-300 ${getOptionStyle(option)}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-all ${getOptionCircleStyle(option)}`}>
                        {option}
                      </div>
                      <span className="text-sm flex-1">
                        <MathDisplay text={optionText} />
                      </span>
                      {getOptionIcon(option)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Per-question explanation */}
            {isCurrentAnswered && currentAnswer && (
              <div className={`mt-4 p-3 rounded-lg border ${
                currentAnswer.isCorrect
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {currentAnswer.isCorrect ? (
                    <span className="font-bold text-sm text-green-700 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Correct!
                    </span>
                  ) : (
                    <span className="font-bold text-sm text-red-700 dark:text-red-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Incorrect
                    </span>
                  )}
                </div>
                <div className="text-xs text-foreground/80 leading-relaxed">
                  <MathDisplay text={currentAnswer.explanation} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Nav Bar */}
      <div className="shrink-0 z-30 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <div className="container mx-auto max-w-3xl flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentIndex === 0}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Prev
          </Button>

          <span className="text-xs text-muted-foreground">
            {isCurrentAnswered ? (currentAnswer?.isCorrect ? '✅' : '❌') : `Q${currentIndex + 1}`}
          </span>

          <Button
            size="sm"
            onClick={() => { cancelAutoAdvance(); handleNext(); }}
            disabled={!isCurrentAnswered && currentIndex < questions.length - 1}
          >
            {currentIndex < questions.length - 1 ? (
              <>Next <ArrowRight className="w-4 h-4 ml-1" /></>
            ) : (
              <>Results <Trophy className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </div>
      </div>

      {/* Report Dialog */}
      {reportingQuestionId && (
        <QuestionReportDialog
          questionId={reportingQuestionId}
          questionText={currentQuestion?.question}
          onClose={() => setReportingQuestionId(null)}
        />
      )}
    </div>
  );
};

export default PracticePage;
