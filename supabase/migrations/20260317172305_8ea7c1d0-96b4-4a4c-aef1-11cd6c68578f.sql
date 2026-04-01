-- Fix #1: Reset invalid streak data for users who have streak but haven't met daily goal
-- One-time data cleanup: set current_streak=0, last_streak_date=NULL for all users
-- since the old RPC was incrementing streaks without checking daily goal completion
UPDATE profiles
SET current_streak = 0,
    last_streak_date = NULL,
    updated_at = now()
WHERE current_streak > 0
  AND id NOT IN (
    -- Only preserve streaks for users who actually met their daily goal today
    SELECT qa.user_id
    FROM question_attempts qa
    JOIN profiles p ON p.id = qa.user_id
    WHERE qa.mode = 'practice'
      AND qa.created_at >= (CURRENT_DATE || 'T00:00:00Z')::timestamptz
      AND qa.created_at < (CURRENT_DATE || 'T00:00:00Z')::timestamptz + interval '1 day'
    GROUP BY qa.user_id, p.daily_goal
    HAVING COUNT(*) >= COALESCE(p.daily_goal, 15)
  );