-- Fix streak recovery when last_activity_date is already today but current_streak is 0
-- This can happen when previous flows set the activity date without correctly incrementing the streak.
create or replace function public.update_streak_stats(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_profile record;
  v_today text;
  v_yesterday text;
  v_new_streak integer;
  v_new_longest integer;
  v_days_since integer;
  v_used_freeze boolean := false;
begin
  if auth.uid() is null or auth.uid() != p_user_id then
    return jsonb_build_object('error', 'Unauthorized');
  end if;

  v_today := to_char(now() at time zone 'UTC', 'YYYY-MM-DD');
  v_yesterday := to_char((now() at time zone 'UTC' - interval '1 day'), 'YYYY-MM-DD');

  select current_streak, longest_streak, last_activity_date, streak_freeze_available
  into v_profile
  from profiles where id = p_user_id;

  if not found then
    return jsonb_build_object('error', 'Profile not found');
  end if;

  -- Already active today: preserve streak, but recover broken zero-state to 1
  if v_profile.last_activity_date = v_today::date then
    if coalesce(v_profile.current_streak, 0) <= 0 then
      update profiles set
        current_streak = 1,
        longest_streak = greatest(coalesce(v_profile.longest_streak, 0), 1),
        last_streak_date = v_today::date,
        updated_at = now()
      where id = p_user_id;

      return jsonb_build_object(
        'success', true,
        'streak', 1,
        'longest_streak', greatest(coalesce(v_profile.longest_streak, 0), 1),
        'already_updated', true,
        'recovered', true
      );
    end if;

    return jsonb_build_object('success', true, 'streak', coalesce(v_profile.current_streak, 0), 'already_updated', true);
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
    last_activity_date = v_today::date,
    last_streak_date = v_today::date,
    streak_freeze_available = case when v_used_freeze then false else streak_freeze_available end,
    updated_at = now()
  where id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'streak', v_new_streak,
    'longest_streak', v_new_longest,
    'used_freeze', v_used_freeze
  );
end;
$function$;