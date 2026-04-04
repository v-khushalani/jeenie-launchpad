-- Performance indexes for high-concurrency read paths
-- Safe to re-run due to IF NOT EXISTS

create index if not exists idx_question_attempts_user_created_at
  on public.question_attempts (user_id, created_at desc);

create index if not exists idx_question_attempts_user_mode_created_at
  on public.question_attempts (user_id, mode, created_at desc);

create index if not exists idx_test_attempts_user_question
  on public.test_attempts (user_id, question_id);

create index if not exists idx_user_notifications_user_read_created
  on public.user_notifications (user_id, is_read, created_at desc);

create index if not exists idx_daily_progress_user_date_created
  on public.daily_progress (user_id, date, created_at desc);

create index if not exists idx_profiles_total_points
  on public.profiles (total_points desc);

create index if not exists idx_profiles_is_premium
  on public.profiles (is_premium);

create index if not exists idx_exam_config_exam_name
  on public.exam_config (exam_name);
