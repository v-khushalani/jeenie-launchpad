
-- Rewrite update_streak_stats to only increment streak when daily goal is met
CREATE OR REPLACE FUNCTION public.update_streak_stats(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_profile record;
  v_today text;
  v_yesterday text;
  v_new_streak integer;
  v_new_longest integer;
  v_days_since integer;
  v_used_freeze boolean := false;
  v_today_count bigint;
  v_daily_goal integer;
begin
  if auth.uid() is null or auth.uid() != p_user_id then
    return jsonb_build_object('error', 'Unauthorized');
  end if;

  v_today := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
  v_yesterday := to_char((now() at time zone 'UTC' - interval '1 day'), 'YYYY-MM-DD');

  select current_streak, longest_streak, last_activity_date, streak_freeze_available, daily_goal
  into v_profile
  from profiles where id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Profile not found');
  end if;

  v_daily_goal := coalesce(v_profile.daily_goal, 15);

  -- Count today's practice-mode attempts
  select count(*) into v_today_count
  from question_attempts
  where user_id = p_user_id
    and mode = 'practice'
    and created_at >= (v_today || 'T00:00:00Z')::timestamptz
    and created_at < (v_today || 'T00:00:00Z')::timestamptz + interval '1 day';

  -- Always update last_activity_date and last_activity
  update profiles set
    last_activity_date = v_today::date,
    last_activity = now(),
    updated_at = now()
  where id = p_user_id;

  -- If daily goal NOT met, don't touch streak at all
  if v_today_count < v_daily_goal then
    return jsonb_build_object(
      'success', true,
      'streak', coalesce(v_profile.current_streak, 0),
      'daily_goal_met', false,
      'today_count', v_today_count,
      'daily_goal', v_daily_goal
    );
  end if;

  -- Daily goal IS met — now handle streak logic
  -- If streak was already updated today (last_streak_date = today), don't increment again
  if v_profile.last_activity_date = v_today::date then
    -- Already had activity today; if streak is 0, recover to 1
    v_new_streak := greatest(coalesce(v_profile.current_streak, 0), 1);
    v_new_longest := greatest(v_new_streak, coalesce(v_profile.longest_streak, 0));
    
    update profiles set
      current_streak = v_new_streak,
      longest_streak = v_new_longest,
      last_streak_date = v_today::date,
      updated_at = now()
    where id = p_user_id;

    return jsonb_build_object(
      'success', true,
      'streak', v_new_streak,
      'longest_streak', v_new_longest,
      'daily_goal_met', true,
      'already_updated', true
    );
  end if;

  v_new_streak := coalesce(v_profile.current_streak, 0);

  if v_profile.last_activity_date = v_yesterday::date then
    v_new_streak := greatest(1, v_new_streak + 1);
  elsif v_profile.last_activity_date is not null then
    v_days_since := (v_today::date - v_profile.last_activity_date)::integer;
    if v_days_since = 2 and coalesce(v_profile.streak_freeze_available, false) then
      v_new_streak := greatest(1, v_new_streak + 1);
      v_used_freeze := true;
    else
      v_new_streak := 1;
    end if;
  else
    v_new_streak := 1;
  end if;

  v_new_longest := greatest(v_new_streak, coalesce(v_profile.longest_streak, 0));

  update profiles set
    current_streak = v_new_streak,
    longest_streak = v_new_longest,
    last_streak_date = v_today::date,
    streak_freeze_available = case when v_used_freeze then false else streak_freeze_available end,
    updated_at = now()
  where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'streak', v_new_streak,
    'longest_streak', v_new_longest,
    'daily_goal_met', true,
    'used_freeze', v_used_freeze
  );
end;
$function$;

-- Also update check_and_reset_streak to be aware of daily goal completion
-- Streak should only be valid if the user actually met their daily goal on their last active day
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

  v_today := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  v_yesterday := to_char((now() AT TIME ZONE 'UTC' - interval '1 day'), 'YYYY-MM-DD');

  SELECT current_streak, last_activity_date, last_streak_date, streak_freeze_available
  INTO v_profile
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND OR v_profile.last_activity_date IS NULL THEN
    RETURN jsonb_build_object('success', true, 'streak', 0, 'reset', false);
  END IF;

  -- Use last_streak_date (set only when daily goal is met) for streak continuity check
  -- If last_streak_date was today or yesterday, streak is fine
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
