/**
 * AI Study Planner - Custom Hook
 * Manages all data fetching and state
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useExamDates } from '@/hooks/useExamDates';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

import type { StudyPlannerData, AIInsights } from '@/lib/studyPlannerTypes';
import type { TargetExamType } from '@/lib/studyPlannerTypes';
import {
  calculateTimeAllocation,
  categorizeTopics,
  allocateStudyTime,
  generateWeeklyPlan,
  predictRank,
  generateSWOTAnalysis,
  generateMotivation,
  calculateAdaptiveTarget
} from '@/lib/studyPlannerCore';

const MIN_QUESTIONS_REQUIRED = 10;

const normalizeDateString = (value: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
};

export function useStudyPlanner() {
  const { user } = useAuth();
  const { getExamDate } = useExamDates();

  const [data, setData] = useState<StudyPlannerData>({
    dailyStudyHours: 4,
    targetExam: 'JEE',
    examDate: '',
    daysToExam: 0,
    avgAccuracy: 0,
    totalQuestions: 0,
    streak: 0,
    weakTopics: [],
    mediumTopics: [],
    strongTopics: [],
    timeAllocation: { studyTime: 0.6, revisionTime: 0.25, mockTestTime: 0.15 },
    weeklyPlan: [],
    rankPrediction: { currentRank: 0, targetRank: 0, improvementWeeks: 0, weeklyAccuracyTarget: 0, percentileRange: '' },
    swotAnalysis: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    motivation: { message: '', emoji: '🚀', type: 'encouragement' },
    adaptiveTarget: { currentTarget: 15, suggestedTarget: 15, reason: '', shouldAdjust: false },
    aiInsights: null,
    isLoading: true,
    hasEnoughData: false
  });

  const [aiLoading, setAiLoading] = useState(false);

  // Calculate days to exam
  const calculateDaysToExam = useCallback((examDate: string) => {
    if (!examDate) return 365; // Default 1 year if no exam date
    const normalized = normalizeDateString(examDate);
    if (!normalized) return 365;
    const [year, month, day] = normalized.split('-').map(Number);
    const exam = Date.UTC(year, month - 1, day);
    const today = new Date();
    const current = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const days = Math.ceil((exam - current) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, []);

  // Generate plan from local algorithm (instant)
  const generateLocalPlan = useCallback((
    topicMastery: any[],
    profile: any,
    questionsCount: number
  ): StudyPlannerData => {
    // daily_study_hours column doesn't exist, derive from daily_goal (15 questions ~= 2 hours)
    const dailyStudyHours = Math.max(1, Math.min(12, Math.ceil((profile?.daily_goal || 15) / 7.5) || 4));
    const targetExam = (profile?.target_exam || 'JEE') as TargetExamType;

    // Prefer the user's stored target exam date; if missing, derive from
    // the current target exam using the global exam dates helper.
    const derivedExamDate = normalizeDateString(profile?.target_exam_date || getExamDate(targetExam));
    const examDate = derivedExamDate;
    const daysToExam = calculateDaysToExam(examDate);
    const avgAccuracy = profile?.overall_accuracy || 0;
    const streak = profile?.current_streak || 0;

    // Core algorithm calculations
    const timeAllocation = calculateTimeAllocation(daysToExam);
    const categorized = categorizeTopics(topicMastery);
    const allocated = allocateStudyTime(dailyStudyHours, timeAllocation, categorized);
    const weeklyPlan = generateWeeklyPlan(dailyStudyHours, allocated, timeAllocation);
    const rankPrediction = predictRank(avgAccuracy, questionsCount, targetExam);
    const swotAnalysis = generateSWOTAnalysis(categorized);
    const motivation = generateMotivation(streak, avgAccuracy, 0);
    const adaptiveTarget = calculateAdaptiveTarget(profile?.daily_goal || 15, avgAccuracy, 0.7);

    return {
      dailyStudyHours,
      targetExam,
      examDate,
      daysToExam,
      avgAccuracy,
      totalQuestions: questionsCount,
      streak,
      weakTopics: allocated.weak,
      mediumTopics: allocated.medium,
      strongTopics: allocated.strong,
      timeAllocation,
      weeklyPlan,
      rankPrediction,
      swotAnalysis,
      motivation,
      adaptiveTarget,
      aiInsights: null,
      isLoading: false,
      hasEnoughData: true
    };
  }, [calculateDaysToExam, getExamDate]);
  // Load data from Supabase
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setData(prev => ({ ...prev, isLoading: true }));

      // Parallel data fetching
      const [profileRes, questionsRes, topicMasteryRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('question_attempts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('topic_mastery').select('*').eq('user_id', user.id)
      ]);

      const profile = profileRes.data;
      const questionsCount = questionsRes.count || 0;
      const topicMastery = topicMasteryRes.data || [];

      // Check if enough data
      if (questionsCount < MIN_QUESTIONS_REQUIRED || topicMastery.length < 3) {
        setData(prev => ({
          ...prev,
          totalQuestions: questionsCount,
          isLoading: false,
          hasEnoughData: false,
          dailyStudyHours: Math.max(1, Math.min(12, Math.ceil((profile?.daily_goal || 15) / 7.5) || 4)),
          targetExam: (profile?.target_exam || 'JEE') as TargetExamType,
          examDate: normalizeDateString(profile?.target_exam_date || getExamDate((profile?.target_exam || 'JEE') as TargetExamType)),
          daysToExam: calculateDaysToExam(profile?.target_exam_date || getExamDate((profile?.target_exam || 'JEE') as TargetExamType)),
          streak: profile?.current_streak || 0,
          avgAccuracy: profile?.overall_accuracy || 0
        }));
        return;
      }

      // Generate plan using local algorithm
      const planData = generateLocalPlan(topicMastery, profile, questionsCount);
      setData(planData);

    } catch (error) {
      logger.error('Error loading study planner data:', error);
      setData(prev => ({ ...prev, isLoading: false }));
      toast.error('Failed to load study plan');
    }
  }, [user?.id, calculateDaysToExam, generateLocalPlan, getExamDate]);

  // Fetch AI insights (optional enhancement)
  const fetchAIInsights = useCallback(async () => {
    if (!user?.id || !data.hasEnoughData) return;

    try {
      setAiLoading(true);

      const { data: aiData, error } = await aiAPI.generateAIInsights({
        userId: user.id,
        studyHours: data.dailyStudyHours,
        targetExam: data.targetExam,
        daysRemaining: data.daysToExam,
        strengths: data.strongTopics.slice(0, 5).map(t => `${t.subject}: ${t.topic}`),
        weaknesses: data.weakTopics.slice(0, 5).map(t => `${t.subject}: ${t.topic}`),
        avgAccuracy: data.avgAccuracy
      });

      if (error) throw new Error(error.message);

      if (aiData?.insights) {
        setData(prev => ({
          ...prev,
          aiInsights: {
            personalizedGreeting: aiData.insights.personalizedGreeting || '',
            strengthAnalysis: aiData.insights.strengthAnalysis || '',
            weaknessStrategy: aiData.insights.weaknessStrategy || '',
            keyRecommendations: aiData.insights.keyRecommendations || [],
            motivationalMessage: aiData.insights.motivationalMessage || ''
          }
        }));
        toast.success('AI insights loaded!');
      }
    } catch (error) {
      logger.error('Error fetching AI insights:', error);
      toast.error('AI insights unavailable, using local algorithm');
    } finally {
      setAiLoading(false);
    }
  }, [user?.id, data.hasEnoughData, data.dailyStudyHours, data.targetExam, data.daysToExam, data.strongTopics, data.weakTopics, data.avgAccuracy]);

  // Update settings
  const updateSettings = useCallback(async (
    newStudyHours: number,
    newTargetExam: 'JEE' | 'NEET'
  ) => {
    if (!user?.id) return;

    try {
      const newExamDate = getExamDate(newTargetExam);

      await supabase
        .from('profiles')
        .update({
          // Store study hours as daily_goal (hours * 7.5 questions per hour)
          daily_goal: Math.round(newStudyHours * 7.5),
          target_exam: newTargetExam,
          target_exam_date: newExamDate
        })
        .eq('id', user.id);

      // Regenerate plan with new settings
      setData(prev => {
        const daysToExam = calculateDaysToExam(newExamDate);
        const timeAllocation = calculateTimeAllocation(daysToExam);
        const categorized = { weak: prev.weakTopics, medium: prev.mediumTopics, strong: prev.strongTopics };
        const allocated = allocateStudyTime(newStudyHours, timeAllocation, categorized);
        const weeklyPlan = generateWeeklyPlan(newStudyHours, allocated, timeAllocation);
        const rankPrediction = predictRank(prev.avgAccuracy, prev.totalQuestions, newTargetExam);

        return {
          ...prev,
          dailyStudyHours: newStudyHours,
          targetExam: newTargetExam,
          examDate: newExamDate,
          daysToExam,
          timeAllocation,
          weeklyPlan,
          rankPrediction,
          weakTopics: allocated.weak,
          mediumTopics: allocated.medium,
          strongTopics: allocated.strong
        };
      });

      toast.success('Settings updated! Plan regenerated.');
    } catch (error) {
      logger.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  }, [user?.id, getExamDate, calculateDaysToExam]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    aiLoading,
    loadData,
    fetchAIInsights,
    updateSettings
  };
}
