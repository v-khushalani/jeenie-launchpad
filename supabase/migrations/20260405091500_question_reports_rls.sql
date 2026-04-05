-- Allow authenticated users to submit question reports and admins/educators to review them.

alter table public.question_reports enable row level security;

drop policy if exists "Users can insert own question reports" on public.question_reports;
drop policy if exists "Users can view own question reports" on public.question_reports;
drop policy if exists "Staff can manage question reports" on public.question_reports;

create policy "Users can insert own question reports"
  on public.question_reports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view own question reports"
  on public.question_reports
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Staff can manage question reports"
  on public.question_reports
  for all
  to authenticated
  using (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'super_admin'::app_role)
    or has_role(auth.uid(), 'educator'::app_role)
  )
  with check (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'super_admin'::app_role)
    or has_role(auth.uid(), 'educator'::app_role)
  );