-- 1) Activate Foundation batches
UPDATE batches SET is_active = true WHERE exam_type = 'Foundation' AND is_active = false;

-- 2) Add grade and target_exam to protect_premium_fields trigger
CREATE OR REPLACE FUNCTION public.protect_premium_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow SECURITY DEFINER functions (which run as the function owner) to pass through
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- If the caller is NOT an admin, block changes to sensitive fields
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    NEW.is_premium := OLD.is_premium;
    NEW.subscription_end_date := OLD.subscription_end_date;
    NEW.daily_question_limit := OLD.daily_question_limit;
    NEW.total_points := OLD.total_points;
    NEW.current_streak := OLD.current_streak;
    NEW.longest_streak := OLD.longest_streak;
    NEW.questions_completed := OLD.questions_completed;
    NEW.total_questions_solved := OLD.total_questions_solved;
    NEW.overall_accuracy := OLD.overall_accuracy;
    NEW.level := OLD.level;
    NEW.level_progress := OLD.level_progress;
    NEW.referral_code := OLD.referral_code;
    NEW.goal_locked := OLD.goal_locked;
    NEW.goal_locked_at := OLD.goal_locked_at;
    -- Lock grade and target_exam once set (goal_locked = true)
    IF OLD.goal_locked = true THEN
      NEW.grade := OLD.grade;
      NEW.target_exam := OLD.target_exam;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;