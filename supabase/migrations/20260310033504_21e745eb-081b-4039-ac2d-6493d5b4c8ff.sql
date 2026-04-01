
-- Auto-classify difficulty for all 73k questions using heuristics
CREATE OR REPLACE FUNCTION public.classify_question_difficulty()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_easy int := 0;
  v_hard int := 0;
  v_total int := 0;
BEGIN
  -- EASY: short questions, recall-based keywords, no complex math
  UPDATE questions SET difficulty = 'Easy'
  WHERE difficulty = 'Medium'
    AND (
      -- Short + recall keywords
      (LENGTH(question) < 150 AND (
        question ~* '(which of the following|name the|is known as|full form|is called|define |what is the|si unit of|unit of|dimension of|chemical name|common name|stands for|is a type of|belongs to|the formula of)'
      ))
      OR
      -- Very short questions (likely direct recall)
      (LENGTH(question) < 80)
      OR
      -- Simple "which of the following" pattern with short text
      (LENGTH(question) < 200 AND question ~* '^which (of the following|one)')
    )
    AND NOT (question ~* '(prove|derive|evaluate|integrate|differentiate|matrix|determinant)')
    AND COALESCE(exam, '') NOT ILIKE '%advanced%';
  GET DIAGNOSTICS v_easy = ROW_COUNT;

  -- HARD: long questions, complex math, JEE Advanced, multi-step
  UPDATE questions SET difficulty = 'Hard'
  WHERE difficulty = 'Medium'
    AND (
      -- JEE Advanced
      (exam ILIKE '%advanced%')
      OR
      -- Long + complex keywords
      (LENGTH(question) > 300 AND question ~* '(prove that|derive|evaluate the|if and only if|necessary and sufficient|differential equation)')
      OR
      -- Contains heavy math notation
      (question ~* '(\\\\int|\\\\sum|\\\\prod|\\\\frac\{d|\\\\begin\{|∫|Σ|∂|∇)')
      OR
      -- Very long questions with multiple conditions
      (LENGTH(question) > 400)
      OR
      -- Numerical / assertion-reason type
      (question_type IN ('numerical', 'assertion_reason'))
      OR
      -- Old PYQs (pre-2005) tend to be harder
      (year IS NOT NULL AND year < 2005 AND LENGTH(question) > 200)
    );
  GET DIAGNOSTICS v_hard = ROW_COUNT;

  SELECT COUNT(*) INTO v_total FROM questions;

  RETURN jsonb_build_object(
    'success', true,
    'easy_classified', v_easy,
    'hard_classified', v_hard,
    'total_questions', v_total
  );
END;
$$;
