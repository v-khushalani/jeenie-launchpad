-- Fix recursive RLS policies on test session tables.
-- The previous policy stack caused 42P17 errors during monthly count, history load, and session writes.

DO $$
DECLARE
  rel text;
  policy_record record;
BEGIN
  FOREACH rel IN ARRAY ARRAY['test_sessions', 'test_session_questions', 'test_session_answers'] LOOP
    IF to_regclass(format('public.%s', rel)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rel);

      FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = rel
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, rel);
      END LOOP;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.test_sessions') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "test_sessions_select_own" ON public.test_sessions FOR SELECT USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "test_sessions_insert_own" ON public.test_sessions FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "test_sessions_update_own" ON public.test_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "test_sessions_delete_own" ON public.test_sessions FOR DELETE USING (auth.uid() = user_id)';
  END IF;

  IF to_regclass('public.test_session_questions') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "test_session_questions_select_own" ON public.test_session_questions FOR SELECT USING (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "test_session_questions_insert_own" ON public.test_session_questions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "test_session_questions_update_own" ON public.test_session_questions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "test_session_questions_delete_own" ON public.test_session_questions FOR DELETE USING (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()))';
  END IF;

  IF to_regclass('public.test_session_answers') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "test_session_answers_select_own" ON public.test_session_answers FOR SELECT USING (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "test_session_answers_insert_own" ON public.test_session_answers FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "test_session_answers_update_own" ON public.test_session_answers FOR UPDATE USING (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()))';
    EXECUTE 'CREATE POLICY "test_session_answers_delete_own" ON public.test_session_answers FOR DELETE USING (EXISTS (SELECT 1 FROM public.test_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()))';
  END IF;
END $$;
