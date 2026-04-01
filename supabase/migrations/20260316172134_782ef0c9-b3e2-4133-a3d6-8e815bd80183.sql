
-- Security definer RPC to update practice stats, bypassing protect_premium_fields trigger
CREATE OR REPLACE FUNCTION public.update_practice_stats(
  p_user_id uuid,
  p_points_delta integer,
  p_is_correct boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_new_total_points integer;
  v_new_total_solved integer;
  v_new_accuracy numeric;
  v_new_level text;
  v_new_level_progress numeric;
  v_new_streak integer;
  v_new_longest integer;
  v_today text;
  v_yesterday text;
  v_streak_updated boolean := false;
BEGIN
  -- Only the authenticated user can update their own stats
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Get current profile
  SELECT total_points, total_questions_solved, overall_accuracy, 
         current_streak, longest_streak, last_activity_date, streak_freeze_available
  INTO v_profile
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  -- Calculate new stats
  v_new_total_points := GREATEST(0, COALESCE(v_profile.total_points, 0) + p_points_delta);
  v_new_total_solved := COALESCE(v_profile.total_questions_solved, 0) + 1;
  
  -- Weighted running average for accuracy
  IF v_new_total_solved > 0 THEN
    v_new_accuracy := ROUND(
      ((COALESCE(v_profile.overall_accuracy, 0) * (v_new_total_solved - 1)) + (CASE WHEN p_is_correct THEN 100 ELSE 0 END))::numeric / v_new_total_solved, 1
    );
  ELSE
    v_new_accuracy := 0;
  END IF;

  -- Calculate level from points
  v_new_level := CASE
    WHEN v_new_total_points <= 1000 THEN 'BEGINNER'
    WHEN v_new_total_points <= 3000 THEN 'LEARNER'
    WHEN v_new_total_points <= 7000 THEN 'ACHIEVER'
    WHEN v_new_total_points <= 20000 THEN 'EXPERT'
    WHEN v_new_total_points <= 50000 THEN 'MASTER'
    ELSE 'LEGEND'
  END;

  -- Calculate level progress
  v_new_level_progress := CASE
    WHEN v_new_total_points <= 1000 THEN (v_new_total_points::numeric / 1000) * 100
    WHEN v_new_total_points <= 3000 THEN ((v_new_total_points - 1001)::numeric / 1999) * 100
    WHEN v_new_total_points <= 7000 THEN ((v_new_total_points - 3001)::numeric / 3999) * 100
    WHEN v_new_total_points <= 20000 THEN ((v_new_total_points - 7001)::numeric / 12999) * 100
    WHEN v_new_total_points <= 50000 THEN ((v_new_total_points - 20001)::numeric / 29999) * 100
    ELSE 100
  END;

  -- Update profile (this runs as SECURITY DEFINER so bypasses the trigger)
  UPDATE profiles SET
    total_points = v_new_total_points,
    total_questions_solved = v_new_total_solved,
    questions_completed = v_new_total_solved,
    overall_accuracy = v_new_accuracy,
    level = v_new_level,
    level_progress = LEAST(v_new_level_progress, 100),
    last_activity = now(),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_points', v_new_total_points,
    'total_questions_solved', v_new_total_solved,
    'overall_accuracy', v_new_accuracy,
    'level', v_new_level,
    'level_progress', LEAST(v_new_level_progress, 100)
  );
END;
$$;

-- Security definer RPC to update streak, bypassing protect_premium_fields trigger
CREATE OR REPLACE FUNCTION public.update_streak_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_today text;
  v_yesterday text;
  v_new_streak integer;
  v_new_longest integer;
  v_days_since integer;
  v_used_freeze boolean := false;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  v_today := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  v_yesterday := to_char((now() AT TIME ZONE 'UTC' - interval '1 day'), 'YYYY-MM-DD');

  SELECT current_streak, longest_streak, last_activity_date, streak_freeze_available
  INTO v_profile
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  -- Already updated today
  IF v_profile.last_activity_date = v_today::date THEN
    RETURN jsonb_build_object('success', true, 'streak', COALESCE(v_profile.current_streak, 0), 'already_updated', true);
  END IF;

  v_new_streak := COALESCE(v_profile.current_streak, 0);

  IF v_profile.last_activity_date = v_yesterday::date THEN
    v_new_streak := v_new_streak + 1;
  ELSIF v_profile.last_activity_date IS NOT NULL THEN
    v_days_since := (v_today::date - v_profile.last_activity_date)::integer;
    IF v_days_since = 2 AND COALESCE(v_profile.streak_freeze_available, false) THEN
      v_new_streak := v_new_streak + 1;
      v_used_freeze := true;
    ELSE
      v_new_streak := 1;
    END IF;
  ELSE
    v_new_streak := 1;
  END IF;

  v_new_longest := GREATEST(v_new_streak, COALESCE(v_profile.longest_streak, 0));

  UPDATE profiles SET
    current_streak = v_new_streak,
    longest_streak = v_new_longest,
    last_activity_date = v_today::date,
    last_streak_date = v_today::date,
    streak_freeze_available = CASE WHEN v_used_freeze THEN false ELSE streak_freeze_available END,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'streak', v_new_streak,
    'longest_streak', v_new_longest,
    'used_freeze', v_used_freeze
  );
END;
$$;
