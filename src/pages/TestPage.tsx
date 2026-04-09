import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import Header from '@/components/Header';
import LoadingScreen from '@/components/ui/LoadingScreen';
import {
  BookOpen, Trophy, Play, Clock, Target, FileText, ArrowLeft, CheckCircle2,
  Brain, Sparkles, Crown, Award, Users, Calendar
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PricingModal from '@/components/PricingModal';
import { logger } from '@/utils/logger';
import { parseGrade, isFoundationGrade, extractGradeFromExamType } from '@/utils/gradeParser';
import { FilterPills, MultiFilterPills } from '@/components/ui/FilterPills';
import { SUBSCRIPTION_CONFIG } from '@/constants/unified';
import { testsAPI } from '@/services/api';
import { 
  getBatchForStudent, 
  getBatchSubjectsFromDB, 
  getFilteredSubjects, 
  getAllowedSubjects, 
  logBatchConfig 
} from '@/utils/batchConfig';
import {
  getTestSeriesQuestions,
  mapBatchToExamField
} from '@/utils/batchQueryBuilder';
import { getExamPattern, EXAM_PATTERNS } from '@/config/examPatterns';
import { fetchAllPaginated } from '@/utils/supabasePagination';

interface ChapterOption {
  id: string;
  subject: string;
  chapter: string;
}

interface TestHistorySession {
  id: string;
  title: string | null;
  status: string | null;
  score: number | null;
  accuracy: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  time_taken: number | null;
  group_test_id: string | null;
  completed_at: string | null;
  started_at: string | null;
  created_at: string | null;
}

const LOCAL_TEST_HISTORY_KEY = 'testHistoryLocal';
const LOCAL_MONTHLY_TEST_USAGE_KEY = 'testMonthlyUsageLocal';

const TestPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [testMode, setTestMode] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState<Record<string, ChapterOption[]>>({});
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedChapters, setSelectedChapters] = useState<ChapterOption[]>([]);
  const [availableChapters, setAvailableChapters] = useState<ChapterOption[]>([]);
  const [profile, setProfile] = useState(null);
  const [pyqExam, setPyqExam] = useState("");
  const [pyqYear, setPyqYear] = useState("");

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isPremium } = useAuth();
  const [monthlyTestsUsed, setMonthlyTestsUsed] = useState(0);
  const MONTHLY_LIMIT_FREE = SUBSCRIPTION_CONFIG.FREE.monthlyTestLimit;
  const [testHistory, setTestHistory] = useState<TestHistorySession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);

  const getCurrentMonthKey = () => {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  };

  const getLocalMonthlyUsage = (userId: string) => {
    try {
      const raw = localStorage.getItem(LOCAL_MONTHLY_TEST_USAGE_KEY);
      if (!raw) return 0;

      const parsed = JSON.parse(raw) as Record<string, number>;
      const key = `${userId}:${getCurrentMonthKey()}`;
      const value = parsed?.[key];
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  };

  const setLocalMonthlyUsage = (userId: string, nextValue: number) => {
    try {
      const raw = localStorage.getItem(LOCAL_MONTHLY_TEST_USAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      const key = `${userId}:${getCurrentMonthKey()}`;
      parsed[key] = Math.max(0, nextValue);
      localStorage.setItem(LOCAL_MONTHLY_TEST_USAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Ignore local storage failures and rely on cloud-only count.
    }
  };

  const incrementLocalMonthlyUsage = (userId: string) => {
    const nextValue = getLocalMonthlyUsage(userId) + 1;
    setLocalMonthlyUsage(userId, nextValue);
    return nextValue;
  };

  const checkMonthlyUsage = async () => {
    // Skip check for premium users
    if (isPremium) {
      setMonthlyTestsUsed(0);
      return 0;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMonthlyTestsUsed(0);
        return 0;
      }

      const localMonthlyCount = getLocalMonthlyUsage(user.id);

      // Get start of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Count completed/reserved test sessions this month using safe row fetch (avoid HEAD/count edge-case errors)
      const { data, error } = await supabase
        .from('test_sessions')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
        .limit(MONTHLY_LIMIT_FREE + 5);
      
      if (error) {
        logger.error('Error counting test sessions:', error);
        setMonthlyTestsUsed(localMonthlyCount);
        return localMonthlyCount;
      }
      
      const cloudMonthlyCount = data?.length || 0;
      const effectiveMonthlyCount = Math.max(cloudMonthlyCount, localMonthlyCount);
      setMonthlyTestsUsed(effectiveMonthlyCount);
      logger.info('Monthly test usage:', {
        cloudCount: cloudMonthlyCount,
        localCount: localMonthlyCount,
        effectiveCount: effectiveMonthlyCount,
        limit: MONTHLY_LIMIT_FREE,
      });
      return effectiveMonthlyCount;
    } catch (error) {
      logger.error('Error checking monthly usage:', error);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const fallbackCount = user ? getLocalMonthlyUsage(user.id) : 0;
        setMonthlyTestsUsed(fallbackCount);
        return fallbackCount;
      } catch {
        setMonthlyTestsUsed(0);
        return 0;
      }
    }
  };

  useEffect(() => {
    loadProfile();
    checkMonthlyUsage();
    loadTestHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  useEffect(() => {
    if (profile) {
      logger.info('TestPage: Profile changed, reloading subjects/chapters', {
        target_exam: profile?.target_exam,
        grade: profile?.grade,
        batch_id: profile?.batch_id
      });
      fetchSubjectsAndChapters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.target_exam, profile?.grade, profile?.batch_id]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      logger.error('Error loading profile:', error);
    }
  };

  const fetchSubjectsAndChapters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's target exam and grade for subject/chapter filtering
      let targetExam = profile?.target_exam || 'JEE';
      let userGrade = profile?.grade || 12;
      
      // Parse grade properly (handles strings like "9th", "9", numbers, etc.)
      userGrade = parseGrade(userGrade);

      // Normalize Foundation exam
      if (isFoundationGrade(userGrade) && targetExam === 'Foundation') {
        targetExam = `Foundation-${userGrade}`;
      }
      
      // Get student's batch with its subjects from batch_subjects table
      let batch = await getBatchForStudent(user.id, userGrade, targetExam);
      
      logBatchConfig('fetchSubjectsAndChapters', user.id, userGrade, targetExam, batch);

      // Get allowed subjects for this target exam
      const examSubjects = getAllowedSubjects(targetExam);
      
      // Determine subjects to show
      let subjectsToShow: string[] = [];
      
      if (!batch && user?.id) {
        // Batch not found - try to create it automatically
        logger.info('Batch not found, attempting auto-creation...', { targetExam, userGrade });
        
        try {
          const examType = isFoundationGrade(userGrade) ? 'Foundation' : (targetExam?.includes('NEET') ? 'NEET' : 'JEE');
          
          // Subject map for batch creation
          const subjectMap: { [key: string]: string[] } = {
            'Foundation': ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
            'JEE': ['Physics', 'Chemistry', 'Mathematics'],
            'NEET': ['Physics', 'Chemistry', 'Biology'],
          };

          // Try to create batch
          const { data: newBatch } = await supabase
            .from('batches')
            .insert({
              name: `Grade ${userGrade} - ${examType}`,
              exam_type: examType,
              grade: userGrade,
              description: `Grade ${userGrade} - ${examType} Study Material`,
              is_active: true,
              is_free: true,
              display_order: userGrade,
            })
            .select('id')
            .single();

          if (newBatch) {
            // Add subjects
            const subjects = subjectMap[examType] || [];
            await supabase
              .from('batch_subjects')
              .insert(
                subjects.map((subject, index) => ({
                  batch_id: newBatch.id,
                  subject,
                  display_order: index + 1,
                }))
              );

            batch = {
              id: newBatch.id,
              name: `Grade ${userGrade} - ${examType}`,
              slug: `grade-${userGrade}-${examType.toLowerCase()}`,
              grade: userGrade,
              exam_type: examType,
              subjects: subjects,
            };

            logger.info('✅ Batch created automatically:', newBatch.id);
          }
        } catch (error) {
          logger.warn('Could not auto-create batch:', error);
        }
      }
      
      if (batch && batch.subjects.length > 0) {
        // Use intersection of allowed subjects (by target_exam) and batch subjects
        subjectsToShow = getFilteredSubjects(targetExam, batch.subjects);
      } else {
        // No batch found - try to use default subjects based on exam type
        logger.warn('No batch found, using default subjects', {
          userId: user.id,
          userGrade,
          targetExam,
        });
        
        // Use default subjects for the exam type so tests can still work
        subjectsToShow = examSubjects;
        
        // Don't block the user - just show a warning
        if (subjectsToShow.length === 0) {
          toast.error('Unable to load test configuration. Please update your profile.');
          navigate('/goal-selection');
          return;
        }
      }

      // Get all chapters for the selected subjects
      let chaptersQuery = supabase
        .from('chapters')
        .select('id, subject, chapter_name, chapter_number, batch_id')
        .in('subject', subjectsToShow)
        .order('chapter_number');

      // Filter chapters by batch if available OR allow globally available chapters
      if (batch && batch.id) {
        chaptersQuery = chaptersQuery.or(`batch_id.eq.${batch.id},batch_id.is.null`);
      } else {
        chaptersQuery = chaptersQuery.is('batch_id', null);
      }

      const { data: chaptersData, error: chaptersError } = await chaptersQuery;
      
      if (chaptersError) throw chaptersError;

      const chaptersBySubject: Record<string, ChapterOption[]> = {};
      
      subjectsToShow.forEach(subject => {
        const subjectChapters = (chaptersData
          ?.filter(c => c.subject === subject)
          .map(c => ({
            id: c.id,
            subject: c.subject,
            chapter: c.chapter_name,
          })) || []) as ChapterOption[];
        chaptersBySubject[subject] = subjectChapters;
      });

      setSubjects(subjectsToShow);
      setChapters(chaptersBySubject);
    } catch (error) {
      logger.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    }
  };

  const loadTestHistory = async () => {
    const getLocalHistory = (): TestHistorySession[] => {
      try {
        const raw = localStorage.getItem(LOCAL_TEST_HISTORY_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw) as TestHistorySession[];
        if (!Array.isArray(parsed)) return [];

        return parsed
          .filter((item) => item && typeof item.id === 'string')
          .sort((a, b) => {
            const aDate = new Date(a.completed_at || a.started_at || a.created_at || 0).getTime();
            const bDate = new Date(b.completed_at || b.started_at || b.created_at || 0).getTime();
            return bDate - aDate;
          });
      } catch (err) {
        logger.warn('Invalid local test history format, ignoring.', err);
        return [];
      }
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setHistoryLoadError(null);

      const { data, error } = await supabase
        .from('test_sessions')
        .select('id, title, status, score, accuracy, correct_answers, total_questions, time_taken, group_test_id, completed_at, started_at, created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const localHistory = getLocalHistory();
      const merged = [...(data || []), ...localHistory].filter(
        (session, index, arr) => arr.findIndex((s) => s.id === session.id) === index
      );
      merged.sort((a, b) => {
        const aDate = new Date(a.completed_at || a.started_at || a.created_at || 0).getTime();
        const bDate = new Date(b.completed_at || b.started_at || b.created_at || 0).getTime();
        return bDate - aDate;
      });
      setTestHistory(merged);
    } catch (error) {
      logger.error('Error loading test history:', error);
      setHistoryLoadError('Cloud history unavailable right now. Showing local history only.');
      setTestHistory(getLocalHistory());
    }
  };

  const reserveSessionOrProceedLocally = async (
    userId: string,
    subject: string,
    totalQuestions: number,
    title: string,
    questionIds: string[],
    groupTestId?: string
  ): Promise<string | null> => {
    const reservation = await testsAPI.reserveTestSessionLegacy(
      userId,
      subject,
      totalQuestions,
      title,
      questionIds,
      groupTestId,
    );

    if (reservation.error || !reservation.data?.id) {
      logger.warn('Unable to reserve test session, continuing in local mode.', {
        code: reservation.error?.code,
        message: reservation.error?.message,
      });
      toast.warning('Cloud sync issue detected. Test started in local mode; history sync may be delayed.');
      return null;
    }

    return reservation.data.id;
  };

  const handleSubjectToggle = (subject) => {
    setSelectedSubjects(prev => {
      const newSelection = prev.includes(subject) 
        ? prev.filter(s => s !== subject) : [...prev, subject];
      const newChapters = newSelection.flatMap(s => 
        chapters[s] || []
      );
      setAvailableChapters(newChapters);
      setSelectedChapters(prevChapters => 
        prevChapters.filter(ch => newChapters.some(nc => nc.id === ch.id))
      );
      return newSelection;
    });
  };

  const handleChapterToggle = (chapterOption: ChapterOption) => {
    setSelectedChapters(prev => {
      const exists = prev.some(ch => ch.id === chapterOption.id);
      return exists ? prev.filter(ch => ch.id !== chapterOption.id)
        : [...prev, chapterOption];
    });
  };

  const startTest = async (mode = testMode) => {
    // Re-check usage at click-time so free limit cannot be bypassed on stale UI state.
    const latestMonthlyUsage = await checkMonthlyUsage();

    // Early exit for free users who exceeded limit
    if (!isPremium && latestMonthlyUsage >= MONTHLY_LIMIT_FREE) {
      setShowUpgradeModal(true);
      toast.error(`You've used all ${MONTHLY_LIMIT_FREE} free tests this month!`);
      return;
    }

    // For PYQ mock test
    if (mode === "pyq") {
      if (!pyqExam || !pyqYear) {
        toast.error("Please select exam and year");
        return;
      }
      setLoading(true);
      toast.loading("Preparing your PYQ mock test...");

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Please login to take tests");
          navigate('/login');
          return;
        }

        const pattern = getExamPattern(pyqExam);

        const [attemptedQuestions, testAttemptedQuestions] = await Promise.all([
          fetchAllPaginated(() => supabase.from('question_attempts').select('question_id').eq('user_id', user.id)),
          fetchAllPaginated(() => supabase.from('test_attempts').select('question_id').eq('user_id', user.id))
        ]);

        const attemptedIds = [
          ...new Set([
            ...(attemptedQuestions?.map(a => a.question_id) || []),
            ...(testAttemptedQuestions?.map(a => a.question_id) || [])
          ])
        ];

        // Fetch per-subject to match actual exam pattern
        const allSelected: any[] = [];
        for (const subject of pattern.subjects) {
          const config = pattern.subjectConfig[subject];
          let query = supabase.from('questions').select('*')
            .eq('exam', pyqExam)
            .eq('year', parseInt(pyqYear))
            .eq('subject', subject);

          if (attemptedIds.length > 0) {
            query = query.not('id', 'in', `(${attemptedIds.join(',')})`);
          }

          const { data: subjectQs } = await query.limit(config.questionsPerSubject * 2);
          if (subjectQs && subjectQs.length > 0) {
            const shuffled = subjectQs.sort(() => Math.random() - 0.5);
            allSelected.push(...shuffled.slice(0, config.questionsPerSubject));
          }
        }

        if (allSelected.length === 0) {
          toast.dismiss();
          toast.error("No PYQ questions available for this exam and year.");
          setLoading(false);
          return;
        }

        if (allSelected.length < pattern.totalQuestions) {
          toast.dismiss();
          toast.info(`Only ${allSelected.length} PYQ questions available (${pattern.totalQuestions} needed for full paper).`);
        }

        const reservedSessionId = await reserveSessionOrProceedLocally(
          user.id,
          pyqExam,
          allSelected.length,
          `${pyqExam} ${pyqYear} - PYQ Mock Test`,
          allSelected.map(question => question.id),
        );

        const testSession = {
          id: Date.now().toString(),
          title: `${pyqExam} ${pyqYear} - PYQ Mock Test`,
          questions: allSelected,
          duration: pattern.duration,
          startTime: new Date().toISOString(),
          examPattern: pyqExam,
          sessionId: reservedSessionId || undefined,
        };

        localStorage.setItem('currentTest', JSON.stringify(testSession));
        const nextMonthlyUsage = incrementLocalMonthlyUsage(user.id);
        setMonthlyTestsUsed(prev => Math.max(prev + 1, nextMonthlyUsage));
        toast.dismiss();
        toast.success(`PYQ Mock Test started with ${allSelected.length} questions!`);
        navigate('/test-attempt');
      } catch (error) {
        logger.error('Error starting PYQ test:', error);
        toast.dismiss();
        toast.error("Failed to start PYQ test");
        setLoading(false);
      }
      return;
    }

    // For full mock test
    if (mode === "full") {
      setLoading(true);
      toast.loading("Preparing your full mock test...");

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("Please login to take tests");
          navigate('/login');
          return;
        }

        const targetExam = profile?.target_exam || 'JEE';
        const userGrade = parseGrade(profile?.grade || 12);
        
        // Determine which exam pattern to use
        let examPatternName = targetExam;
        if (targetExam === 'JEE') examPatternName = 'JEE Mains';
        const pattern = getExamPattern(examPatternName);
        
        const examFieldForTest = mapBatchToExamField(targetExam, userGrade);
        const testBatch = await getBatchForStudent(user.id, userGrade, targetExam);
        logger.info('Full mock test exam field', { targetExam, examFieldForTest, userGrade, batchId: testBatch?.id, pattern: pattern.name });
        
        const [attemptedQuestions, testAttemptedQuestions] = await Promise.all([
          fetchAllPaginated(() => supabase.from('question_attempts').select('question_id').eq('user_id', user.id)),
          fetchAllPaginated(() => supabase.from('test_attempts').select('question_id').eq('user_id', user.id))
        ]);
        
        const attemptedIds = [
          ...new Set([
            ...(attemptedQuestions?.map(a => a.question_id) || []),
            ...(testAttemptedQuestions?.map(a => a.question_id) || [])
          ])
        ];

        // Fetch per-subject to match actual exam pattern
        const allSelected: any[] = [];
        for (const subject of pattern.subjects) {
          const config = pattern.subjectConfig[subject];
          let query = supabase.from('questions').select('*').eq('exam', examFieldForTest).eq('subject', subject);

          if (testBatch?.id) {
            query = query.eq('batch_id', testBatch.id);
          }
          if (attemptedIds.length > 0) {
            query = query.not('id', 'in', `(${attemptedIds.join(',')})`);
          }

          const { data: subjectQs } = await query.limit(config.questionsPerSubject * 2);
          if (subjectQs && subjectQs.length > 0) {
            const shuffled = subjectQs.sort(() => Math.random() - 0.5);
            allSelected.push(...shuffled.slice(0, config.questionsPerSubject));
          }
        }
        
        if (allSelected.length === 0) {
          toast.dismiss();
          toast.error("No new questions available! All questions already attempted.");
          setLoading(false);
          return;
        }

        if (allSelected.length < pattern.totalQuestions) {
          toast.dismiss();
          toast.info(`Only ${allSelected.length} new questions available (${pattern.totalQuestions} needed for full paper). Starting with available questions.`);
        }

        const reservedSessionId = await reserveSessionOrProceedLocally(
          user.id,
          targetExam,
          allSelected.length,
          `Full Syllabus Mock Test - ${pattern.name} Pattern`,
          allSelected.map(question => question.id),
        );

        const testSession = {
          id: Date.now().toString(),
          title: `Full Syllabus Mock Test - ${pattern.name} Pattern`,
          questions: allSelected,
          duration: pattern.duration,
          startTime: new Date().toISOString(),
          examPattern: pattern.name,
          sessionId: reservedSessionId || undefined,
        };

        localStorage.setItem('currentTest', JSON.stringify(testSession));
        const nextMonthlyUsage = incrementLocalMonthlyUsage(user.id);
        setMonthlyTestsUsed(prev => Math.max(prev + 1, nextMonthlyUsage));
            
        toast.dismiss();
        toast.success(`Full mock test started with ${allSelected.length} questions!`);
        navigate('/test-attempt');
      } catch (error) {
        logger.error('Error starting test:', error);
        toast.dismiss();
        toast.error("Failed to start test");
        setLoading(false);
      }
      return;
    }

    // For chapter/subject tests
    if (selectedChapters.length === 0 && selectedSubjects.length === 0) {
      toast.error("Please select at least one chapter or subject");
      return;
    }

    setLoading(true);
    toast.loading("Preparing your test...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login to take tests");
        navigate('/login');
        return;
      }
      
      const [attemptedQuestions2, testAttemptedQuestions2] = await Promise.all([
        fetchAllPaginated(() =>
          supabase
            .from('question_attempts')
            .select('question_id')
            .eq('user_id', user.id)
        ),
        fetchAllPaginated(() =>
          supabase
            .from('test_attempts')
            .select('question_id')
            .eq('user_id', user.id)
        )
      ]);
      
      const attemptedIds = [
        ...new Set([
          ...(attemptedQuestions2?.map(a => a.question_id) || []),
          ...(testAttemptedQuestions2?.map(a => a.question_id) || [])
        ])
      ];

      const targetExam = profile?.target_exam || 'JEE';
      const userGrade = parseGrade(profile?.grade || 12);
      
      // Use proper exam field mapping for Foundation courses
      const examFieldForTest = mapBatchToExamField(targetExam, userGrade);
      const chapterTestBatch = await getBatchForStudent(user.id, userGrade, targetExam);
      logger.info('Chapter/Subject test exam field', { targetExam, examFieldForTest, userGrade, batchId: chapterTestBatch?.id });
      
      const questions = await fetchAllPaginated(() => {
        let query = supabase.from('questions').select('*').eq('exam', examFieldForTest);

        if (chapterTestBatch?.id) {
          query = query.eq('batch_id', chapterTestBatch.id);
        }

        if (mode === "chapter" && selectedChapters.length > 0) {
          query = query.in('chapter_id', selectedChapters.map(ch => ch.id));
        } else if (mode === "subject" && selectedSubjects.length > 0) {
          query = query.in('subject', selectedSubjects);
        }

        if (attemptedIds.length > 0) {
          query = query.not('id', 'in', `(${attemptedIds.join(',')})`);
        }

        return query;
      });
      
      if (!questions || questions.length === 0) {
        toast.dismiss();
        toast.error("No new questions available! All questions already attempted.");
        setLoading(false);
        return;
      }

      // Determine exam pattern for marking scheme and question count
      let examPatternName = targetExam;
      if (targetExam === 'JEE') examPatternName = 'JEE Mains';
      const pattern = getExamPattern(examPatternName);

      // For chapter/subject tests, use per-subject question count from pattern
      // If single subject selected, use that subject's count; otherwise cap at 25
      let questionLimit = 25;
      let testDuration = 60;
      
      if (mode === "subject" && selectedSubjects.length === 1) {
        const subjectConfig = pattern.subjectConfig[selectedSubjects[0]];
        if (subjectConfig) {
          questionLimit = subjectConfig.questionsPerSubject;
          // Scale duration proportionally
          testDuration = Math.round((questionLimit / pattern.totalQuestions) * pattern.duration);
        }
      } else if (mode === "subject" && selectedSubjects.length > 1) {
        // Multiple subjects: sum up per-subject counts
        questionLimit = selectedSubjects.reduce((sum, s) => {
          const cfg = pattern.subjectConfig[s];
          return sum + (cfg ? cfg.questionsPerSubject : 25);
        }, 0);
        testDuration = Math.round((questionLimit / pattern.totalQuestions) * pattern.duration);
      }

      if (questions.length < questionLimit) {
        toast.dismiss();
        toast.info(`Only ${questions.length} new questions available. Starting test with ${questions.length} questions.`);
      }

      const shuffled = questions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(questionLimit, questions.length));

      const reservedSessionId = await reserveSessionOrProceedLocally(
        user.id,
        mode === "chapter" ? (selectedChapters.map(ch => ch.chapter).join(', ') || 'General') : (selectedSubjects.join(', ') || 'General'),
        selected.length,
        mode === "chapter"
          ? `${selectedChapters.map(ch => ch.chapter).join(', ')} - Chapter Test`
          : `${selectedSubjects.join(', ')} - Subject Test`,
        selected.map(question => question.id),
      );

      const testSession = {
        id: Date.now().toString(),
        title: mode === "chapter" 
          ? `${selectedChapters.map(ch => ch.chapter).join(', ')} - Chapter Test`
          : `${selectedSubjects.join(', ')} - Subject Test`,
        questions: selected,
        duration: testDuration,
        startTime: new Date().toISOString(),
        examPattern: pattern.name,
        sessionId: reservedSessionId || undefined,
      };

      localStorage.setItem('currentTest', JSON.stringify(testSession));

      // Increment monthly usage count immediately for UI feedback
      const nextMonthlyUsage = incrementLocalMonthlyUsage(user.id);
      setMonthlyTestsUsed(prev => Math.max(prev + 1, nextMonthlyUsage));
          
      toast.dismiss();
      toast.success(`Test started with ${selected.length} fresh questions!`);
      navigate('/test-attempt');
    } catch (error) {
      logger.error('Error starting test:', error);
      toast.dismiss();
      toast.error("Failed to start test");
      setLoading(false);
    }
  };

  if (showUpgradeModal) {
    return (
      <>
        <div className="mobile-app-shell bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
          <Header />
        </div>
        <PricingModal 
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            navigate('/subscription-plans');
          }}
          limitType="test_limit"
        />
      </>
    );
  }
  
  if (loading) {
    return <LoadingScreen message="Loading your tests..." />;
  }

  if (!testMode) {
    return (
      <div className="mobile-app-shell bg-background flex flex-col overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary rounded-full -translate-y-1/2 translate-x-1/3 opacity-40" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary rounded-full translate-y-1/2 -translate-x-1/3 opacity-30" />
        </div>
        <Header />
        <div className="flex-1 min-h-0 overflow-y-auto relative z-10">
          <div className="container mx-auto px-3 sm:px-4 lg:px-8 max-w-7xl">
            {!isPremium && (
              <div className="mb-4 p-3 sm:p-4 rounded-2xl bg-secondary border border-primary/10 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-primary p-2 rounded-xl shrink-0">
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-primary text-sm sm:text-base">
                        Mock Tests: {monthlyTestsUsed}/{MONTHLY_LIMIT_FREE} this month
                      </p>
                      <p className="text-xs sm:text-sm text-primary/70 mt-1">
                        {monthlyTestsUsed >= MONTHLY_LIMIT_FREE ? (
                          <span className="font-semibold">Limit reached! Upgrade for unlimited tests.</span>
                        ) : (
                          <span>Upgrade to Pro for unlimited mock tests!</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/subscription-plans')}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-4 py-2 rounded-xl"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Button>
                </div>
              </div>
            )}
            {/* Group Test Buttons */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="bg-emerald-600 p-2 rounded-xl shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900 text-sm sm:text-base">Group Test</p>
                    <p className="text-xs sm:text-sm text-emerald-700/70">Create a test & share with friends via WhatsApp/QR code</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => navigate('/group-test/create')}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Create
                  </Button>
                  <Button
                    onClick={() => navigate('/group-test/join')}
                    variant="outline"
                    className="flex-1 sm:flex-none border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-sm"
                  >
                    Join
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Test History */}
            <div className="mb-6 p-4 rounded-2xl border border-border bg-card/60 shadow-sm">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Test History ({testHistory.length})
                </span>
                <span className="text-xs text-muted-foreground">{showHistory ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {historyLoadError && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  {historyLoadError}
                </p>
              )}

              {showHistory && (
                <div className="mt-3">
                  {testHistory.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No tests yet. Start one now and your history will appear here.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {testHistory.map((session) => {
                        const isGroup = !!session.group_test_id;
                        const isLocalOnly = session.id.startsWith('local-');
                        const completedDate = session.completed_at ? new Date(session.completed_at) : session.started_at ? new Date(session.started_at) : new Date(session.created_at);
                        const statusLabel = session.status || (session.completed_at ? 'completed' : 'in_progress');
                        return (
                          <div
                            key={session.id}
                            className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isGroup ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                                {isGroup ? <Users className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {session.title || 'Mock Test'}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{completedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">{statusLabel}</Badge>
                                  {isGroup && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-300 text-emerald-700">Group</Badge>}
                                  {isLocalOnly && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-300 text-amber-700">Local</Badge>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs shrink-0 w-full lg:w-auto justify-between lg:justify-start">
                              <div className="text-center">
                                <div className="font-bold text-foreground">{session.score ?? 0}</div>
                                <div className="text-muted-foreground">Score</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-foreground">{Math.round(session.accuracy ?? 0)}%</div>
                                <div className="text-muted-foreground">Accuracy</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-foreground">{session.correct_answers ?? 0}/{session.total_questions ?? 0}</div>
                                <div className="text-muted-foreground">Correct</div>
                              </div>
                              {session.time_taken && (
                                <div className="text-center">
                                  <div className="font-bold text-foreground">{Math.round(session.time_taken / 60)}m</div>
                                  <div className="text-muted-foreground">Time</div>
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isLocalOnly}
                                className="text-xs h-7 px-2"
                                onClick={() => navigate(`/test-results/${session.id}`)}
                              >
                                {isLocalOnly ? 'Sync Pending' : 'View'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
              <div 
                className="group relative overflow-hidden rounded-2xl bg-white border-2 border-primary/20 hover:border-primary/40 hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
                onClick={() => setTestMode("chapter")}
              >
                <div className="p-4 sm:p-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  
                  <h3 className="text-lg sm:text-2xl font-bold mb-2 text-gray-900">
                    Chapter-wise Test
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-4 sm:mb-6">
                    Select multiple chapters for laser-focused practice
                  </p>
                  
                  <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-bold text-sm sm:text-base">25</div>
                        <div className="text-gray-500 text-xs">Questions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-bold text-sm sm:text-base">60</div>
                        <div className="text-gray-500 text-xs">Minutes</div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold py-2 sm:py-3 rounded-xl shadow-md transition-all duration-300 text-sm sm:text-base">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Select Chapters
                  </Button>
                  
                  <Badge className="mt-3 sm:mt-4 bg-green-50 text-green-700 border-green-200 text-xs">
                    Beginner Friendly
                  </Badge>
                </div>
              </div>

              <div 
                className="group relative overflow-hidden rounded-2xl bg-white border-2 border-purple-200 hover:border-purple-400 hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
                onClick={() => setTestMode("subject")}
              >
                <div className="p-4 sm:p-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Target className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  
                  <h3 className="text-lg sm:text-2xl font-bold mb-2 text-gray-900">
                    Subject-wise Test
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-4 sm:mb-6">
                    Master entire subjects with comprehensive coverage
                  </p>
                  
                  <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-bold text-sm sm:text-base">25</div>
                        <div className="text-gray-500 text-xs">Questions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-bold text-sm sm:text-base">60</div>
                        <div className="text-gray-500 text-xs">Minutes</div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-600/90 hover:to-indigo-600/90 text-white font-semibold py-2 sm:py-3 rounded-xl shadow-md transition-all duration-300 text-sm sm:text-base">
                    <Brain className="w-4 h-4 mr-2" />
                    Select Subjects
                  </Button>
                  
                  <Badge className="mt-3 sm:mt-4 bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                    Intermediate Level
                  </Badge>
                </div>
              </div>

              <div 
                className="group relative overflow-hidden rounded-2xl bg-white border-2 border-orange-200 hover:border-orange-400 hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
                onClick={() => startTest("full")}
              >
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-md text-xs">
                    <Award className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
                
                <div className="p-4 sm:p-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  
                  <h3 className="text-lg sm:text-2xl font-bold mb-2 text-gray-900">
                    Full Syllabus Mock
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-4 sm:mb-6">
                    {(() => {
                      const te = profile?.target_exam || 'JEE';
                      const pn = te === 'JEE' ? 'JEE Mains' : te;
                      const p = getExamPattern(pn);
                      return `${p.name} pattern mock test — real exam simulation`;
                    })()}
                  </p>
                  
                  <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-bold text-sm sm:text-base">
                          {(() => {
                            const te = profile?.target_exam || 'JEE';
                            const pn = te === 'JEE' ? 'JEE Mains' : te;
                            return getExamPattern(pn).totalQuestions;
                          })()}
                        </div>
                        <div className="text-gray-500 text-xs">Questions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-bold text-sm sm:text-base">
                          {(() => {
                            const te = profile?.target_exam || 'JEE';
                            const pn = te === 'JEE' ? 'JEE Mains' : te;
                            return getExamPattern(pn).duration;
                          })()}
                        </div>
                        <div className="text-gray-500 text-xs">Minutes</div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-600/90 hover:to-red-600/90 text-white font-semibold py-2 sm:py-3 rounded-xl shadow-md transition-all duration-300 text-sm sm:text-base">
                    <Play className="w-4 h-4 mr-2" />
                    Start Mock Test
                  </Button>
                  
                  <Badge className="mt-3 sm:mt-4 bg-orange-50 text-orange-700 border-orange-200 text-xs">
                    {(() => {
                      const te = profile?.target_exam || 'JEE';
                      const pn = te === 'JEE' ? 'JEE Mains' : te;
                      const p = getExamPattern(pn);
                      const markInfo = Object.entries(p.subjectConfig).map(([s, c]) => `${s}: +${c.correctMarks}/${c.incorrectMarks}`).join(' • ');
                      return markInfo;
                    })()}
                  </Badge>
                </div>
              </div>

              {/* PYQ Mock Test Card */}
              <div 
                className="group relative overflow-hidden rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-400 hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl"
                onClick={() => setTestMode("pyq")}
              >
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                  <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shadow-md text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    Exam Ready
                  </Badge>
                </div>
                
                <div className="p-4 sm:p-6 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  
                  <h3 className="text-lg sm:text-2xl font-bold mb-2 text-gray-900">
                    PYQ Mock Test
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-4 sm:mb-6">
                    Practice with actual previous year exam questions
                  </p>
                  
                  <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-bold text-sm sm:text-base">
                          {(() => {
                            const te = profile?.target_exam || 'JEE';
                            const pn = te === 'JEE' ? 'JEE Mains' : te;
                            return getExamPattern(pn).totalQuestions;
                          })()}
                        </div>
                        <div className="text-gray-500 text-xs">Questions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-gray-900 font-bold text-sm sm:text-base">
                          {(() => {
                            const te = profile?.target_exam || 'JEE';
                            const pn = te === 'JEE' ? 'JEE Mains' : te;
                            return getExamPattern(pn).duration;
                          })()}
                        </div>
                        <div className="text-gray-500 text-xs">Minutes</div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-500/90 hover:to-yellow-600/90 text-white font-semibold py-2 sm:py-3 rounded-xl shadow-md transition-all duration-300 text-sm sm:text-base">
                    <Calendar className="w-4 h-4 mr-2" />
                    Select Exam & Year
                  </Button>
                  
                  <Badge className="mt-3 sm:mt-4 bg-amber-50 text-amber-700 border-amber-200 text-xs">
                    Past Year Papers
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (testMode === "pyq") {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

    return (
      <div className="mobile-app-shell bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 min-h-0 overflow-y-auto py-4 sm:py-6">
          <div className="container mx-auto px-3 sm:px-4 lg:px-8 max-w-3xl">
            <Button 
              variant="outline"
              className="mb-4 sm:mb-6 border-2 border-amber-500 text-sm"
              onClick={() => {
                setTestMode("");
                setPyqExam("");
                setPyqYear("");
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Test Selection
            </Button>

            <Card className="border-2 border-amber-200 shadow-lg bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-base sm:text-3xl">PYQ Mock Test Setup</span>
                </CardTitle>
                <p className="text-gray-600 mt-2 flex items-center gap-2 text-xs sm:text-base">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                  Select exam and year to practice with actual past paper questions
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-sm sm:text-lg font-bold mb-3 text-gray-900 flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                      1
                    </div>
                    Select Exam
                  </h3>
                  <FilterPills
                    options={["JEE Mains", "JEE Advanced", "NEET", "MH-CET"]}
                    selected={pyqExam}
                    onSelect={setPyqExam}
                  />
                </div>

                <div>
                  <h3 className="text-sm sm:text-lg font-bold mb-3 text-gray-900 flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                      2
                    </div>
                    Select Year
                  </h3>
                  <Select value={pyqYear} onValueChange={setPyqYear}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-500/90 hover:to-yellow-600/90 text-white font-semibold py-3 rounded-xl shadow-md text-sm sm:text-base"
                  disabled={!pyqExam || !pyqYear || loading}
                  onClick={() => startTest("pyq")}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start {pyqExam} {pyqYear} Mock Test
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (testMode === "chapter") {
    return (
      <div className="mobile-app-shell bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 min-h-0 overflow-y-auto py-4 sm:py-6">
          <div className="container mx-auto px-3 sm:px-4 lg:px-8 max-w-6xl">
            
            <Button 
              variant="outline"
              className="mb-4 sm:mb-6 border-2 border-primary text-sm"
              onClick={() => {
                setTestMode("");
                setSelectedSubjects([]);
                setSelectedChapters([]);
                setAvailableChapters([]);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Test Selection
            </Button>

            <Card className="border-2 border-primary/20 shadow-lg bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-blue-50 border-b border-primary/20 p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-base sm:text-3xl">Chapter-wise Test Setup</span>
                </CardTitle>
                <p className="text-gray-600 mt-2 flex items-center gap-2 text-xs sm:text-base">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                  Select subjects first, then choose specific chapters
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900 flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                      1
                    </div>
                    <span className="text-sm sm:text-xl">Select Subjects</span>
                  </h3>
                  <MultiFilterPills
                    options={subjects}
                    selected={selectedSubjects}
                    onToggle={handleSubjectToggle}
                  />
                </div>

                {selectedSubjects.length > 0 && (
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900 flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                        2
                      </div>
                      <span className="text-sm sm:text-xl">Select Chapters</span>
                      <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-xs">
                        {selectedChapters.length} selected
                      </Badge>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {availableChapters.map(({ id, subject, chapter }) => (
                        <div 
                          key={id}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedChapters.some(ch => ch.id === id)
                              ? 'border-purple-500 bg-purple-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-purple-300'
                          }`}
                          onClick={() => handleChapterToggle({ id, subject, chapter })}
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              checked={selectedChapters.some(ch => ch.id === id)}
                              className="w-4 h-4 shrink-0"
                            />
                            <label className="cursor-pointer flex-1 min-w-0">
                              <span className="font-semibold text-gray-900 block text-xs sm:text-sm truncate">{chapter}</span>
                              <Badge variant="outline" className="text-[10px] mt-0.5">
                                {subject}
                              </Badge>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedChapters.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 rounded-xl bg-gradient-to-r from-primary/10 to-purple-50 border-2 border-primary/20 shadow-md gap-3">
                    <div>
                      <p className="font-bold text-xl sm:text-2xl text-gray-900 mb-2">
                        {selectedChapters.length} Chapter{selectedChapters.length > 1 ? 's' : ''} Selected
                      </p>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="font-medium">25 Questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="font-medium">60 Minutes</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => startTest("chapter")}
                      className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-md text-sm sm:text-base"
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Start Test Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (testMode === "subject") {
    return (
      <div className="mobile-app-shell bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 min-h-0 overflow-y-auto py-4 sm:py-6">
          <div className="container mx-auto px-3 sm:px-4 lg:px-8 max-w-6xl">
            
            <Button 
              variant="outline"
              className="mb-4 sm:mb-6 border-2 border-primary text-sm"
              onClick={() => {
                setTestMode("");
                setSelectedSubjects([]);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Test Selection
            </Button>

            <Card className="border-2 border-primary/20 shadow-lg bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-base sm:text-3xl">Subject-wise Test Setup</span>
                </CardTitle>
                <p className="text-gray-600 mt-2 flex items-center gap-2 text-xs sm:text-base">
                  <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                  Choose subjects to test your understanding
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="mb-6 sm:mb-8">
                  <MultiFilterPills
                    options={subjects}
                    selected={selectedSubjects}
                    onToggle={handleSubjectToggle}
                  />
                </div>

                {selectedSubjects.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 shadow-md gap-3">
                    <div>
                      <p className="font-bold text-xl sm:text-2xl text-gray-900 mb-2">
                        {selectedSubjects.length} Subject{selectedSubjects.length > 1 ? 's' : ''} Selected
                      </p>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="font-medium">25 Questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="font-medium">60 Minutes</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => startTest("subject")}
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-600/90 hover:to-pink-600/90 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-md text-sm sm:text-base"
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Start Test Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TestPage;
