
-- RPC to check and reset streak if broken (bypasses protect_premium_fields trigger)
CREATE OR REPLACE FUNCTION public.check_and_reset_streak(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  SELECT current_streak, last_activity_date, streak_freeze_available
  INTO v_profile
  FROM profiles WHERE id = p_user_id;

  IF NOT FOUND OR v_profile.last_activity_date IS NULL THEN
    RETURN jsonb_build_object('success', true, 'streak', 0, 'reset', false);
  END IF;

  -- If last activity was today or yesterday, streak is fine
  IF v_profile.last_activity_date::text = v_today OR v_profile.last_activity_date::text = v_yesterday THEN
    RETURN jsonb_build_object('success', true, 'streak', COALESCE(v_profile.current_streak, 0), 'reset', false);
  END IF;

  v_days_since := (v_today::date - v_profile.last_activity_date)::integer;

  -- If 2 days gap and freeze available, don't reset yet
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
$$;

-- RPC to upsert topic mastery after practice
CREATE OR REPLACE FUNCTION public.upsert_topic_mastery(
  p_user_id uuid,
  p_topic_id uuid,
  p_subject text,
  p_chapter text,
  p_topic text,
  p_is_correct boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing RECORD;
  v_new_attempted integer;
  v_new_correct integer;
  v_new_accuracy numeric;
  v_new_level text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Get existing mastery record
  SELECT questions_attempted, questions_correct, accuracy
  INTO v_existing
  FROM topic_mastery
  WHERE user_id = p_user_id AND topic_id = p_topic_id;

  IF FOUND THEN
    v_new_attempted := COALESCE(v_existing.questions_attempted, 0) + 1;
    v_new_correct := COALESCE(v_existing.questions_correct, 0) + (CASE WHEN p_is_correct THEN 1 ELSE 0 END);
  ELSE
    v_new_attempted := 1;
    v_new_correct := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
  END IF;

  v_new_accuracy := CASE WHEN v_new_attempted > 0 THEN ROUND((v_new_correct::numeric / v_new_attempted) * 100, 1) ELSE 0 END;

  -- Determine mastery level
  v_new_level := CASE
    WHEN v_new_accuracy >= 90 AND v_new_attempted >= 60 THEN 'mastered'
    WHEN v_new_accuracy >= 85 AND v_new_attempted >= 40 THEN 'advanced'
    WHEN v_new_accuracy >= 70 AND v_new_attempted >= 25 THEN 'intermediate'
    ELSE 'beginner'
  END;

  -- Upsert
  INSERT INTO topic_mastery (user_id, topic_id, subject, chapter, topic, questions_attempted, questions_correct, accuracy, current_level, last_practiced, updated_at)
  VALUES (p_user_id, p_topic_id, p_subject, p_chapter, p_topic, v_new_attempted, v_new_correct, v_new_accuracy, v_new_level, now(), now())
  ON CONFLICT (user_id, topic_id)
  DO UPDATE SET
    questions_attempted = v_new_attempted,
    questions_correct = v_new_correct,
    accuracy = v_new_accuracy,
    current_level = v_new_level,
    subject = COALESCE(EXCLUDED.subject, topic_mastery.subject),
    chapter = COALESCE(EXCLUDED.chapter, topic_mastery.chapter),
    topic = COALESCE(EXCLUDED.topic, topic_mastery.topic),
    last_practiced = now(),
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'accuracy', v_new_accuracy, 'level', v_new_level, 'attempted', v_new_attempted);
END;
$$;
