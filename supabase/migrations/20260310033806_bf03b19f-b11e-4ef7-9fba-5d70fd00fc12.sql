
-- The trigger references columns that don't exist (options, correct_answer)
-- Disable it since the actual columns are option_a/b/c/d and correct_option
DROP TRIGGER IF EXISTS trg_record_question_edit ON public.questions;
