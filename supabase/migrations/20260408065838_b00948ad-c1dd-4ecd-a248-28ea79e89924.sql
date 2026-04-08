CREATE OR REPLACE FUNCTION public.check_and_reset_streak(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_today text;
  v_yesterday text;
  v_days_since integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Use IST consistently (same as update_streak_stats)
  v_today := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD');
  v_yesterday := to_char((now() AT TIME ZONE 'Asia/Kolkata' - interval '1 day'), 'YYYY-MM-DD');

  SELECT current_streak, last_activity_date, last_streak_date, streak_freeze_available
  INTO v_profile
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND OR v_profile.last_activity_date IS NULL THEN
    RETURN jsonb_build_object('success', true, 'streak', 0, 'reset', false);
  END IF;

  -- Use last_streak_date (set only when daily goal is met) for streak continuity check
  IF v_profile.last_streak_date IS NOT NULL AND 
     (v_profile.last_streak_date::text = v_today OR v_profile.last_streak_date::text = v_yesterday) THEN
    RETURN jsonb_build_object('success', true, 'streak', COALESCE(v_profile.current_streak, 0), 'reset', false);
  END IF;

  -- Check freeze: 2 days since last streak date
  IF v_profile.last_streak_date IS NOT NULL THEN
    v_days_since := (v_today::date - v_profile.last_streak_date)::integer;
  ELSE
    v_days_since := 999;
  END IF;

  IF v_days_since = 2 AND COALESCE(v_profile.streak_freeze_available, false) THEN
    RETURN jsonb_build_object('success', true, 'streak', COALESCE(v_profile.current_streak, 0), 'reset', false, 'freeze_available', true);
  END IF;

  -- Reset streak to 0
  IF COALESCE(v_profile.current_streak, 0) > 0 THEN
    UPDATE profiles SET current_streak = 0, updated_at = now() WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true, 'streak', 0, 'reset', true, 'previous_streak', v_profile.current_streak);
  END IF;

  RETURN jsonb_build_object('success', true, 'streak', 0, 'reset', false);
END;
$function$;