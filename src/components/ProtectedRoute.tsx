// src/components/ProtectedRoute.tsx

import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { logger } from '@/utils/logger';
import { isGoalComplete, normalizeTargetExam } from '@/config/goalConfig';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const GOAL_CHECK_TIMEOUT = 5_000;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [goalsChecked, setGoalsChecked] = useState(false);
  const [needsGoalSelection, setNeedsGoalSelection] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const checkGoals = async () => {
      if (!user) {
        setGoalsChecked(true);
        return;
      }

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        // Check localStorage cache first
        const cachedGoals = localStorage.getItem('userGoals');
        if (cachedGoals) {
          try {
            const goals = JSON.parse(cachedGoals);
            if (goals?.goal && goals?.grade) {
              setNeedsGoalSelection(false);
              setGoalsChecked(true);
              return;
            }
          } catch {
            // Invalid cached goals — fall through
          }
        }

        // Check session flag — don't remove it so re-mounts still see it
        const goalSelectionComplete = sessionStorage.getItem('goalSelectionComplete') === 'true';
        if (goalSelectionComplete) {
          setNeedsGoalSelection(false);
          setGoalsChecked(true);
          return;
        }

        // Query profile with timeout
        const profilePromise = supabase
          .from('profiles')
          .select('target_exam, grade')
          .eq('id', user.id)
          .maybeSingle();

        const result = await Promise.race([
          profilePromise,
          new Promise<{ data: null; error: { message: string; code: string } }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: { message: 'Goal check timed out', code: 'TIMEOUT' } }), GOAL_CHECK_TIMEOUT)
          ),
        ]);

        const { data: profile, error } = result;

        if (error && error.code === 'TIMEOUT') {
          logger.warn('Goal check timed out — allowing access');
          setNeedsGoalSelection(false);
        } else if (error && error.code !== 'PGRST116') {
          logger.error('Error checking goals:', error);
          setNeedsGoalSelection(false);
        } else if (!isGoalComplete(profile || {})) {
          setNeedsGoalSelection(true);
        } else {
          // Profile is complete — cache for next visit
          const exam = normalizeTargetExam(profile?.target_exam);
          const userGoals = {
            grade: profile!.grade,
            goal: exam,
            subjects: [],
            name: '',
            daysRemaining: 0,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem('userGoals', JSON.stringify(userGoals));
          setNeedsGoalSelection(false);
        }
      } catch (error) {
        logger.error('Error checking goals:', error);
        setNeedsGoalSelection(false);
      }
      
      setGoalsChecked(true);
    };

    if (!isLoading && user) {
      checkGoals();
    } else if (!isLoading) {
      setGoalsChecked(true);
    }
  }, [user, isLoading]);

  if (isLoading || !goalsChecked) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (needsGoalSelection && location.pathname !== '/goal-selection') {
    return <Navigate to="/goal-selection" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
