
-- Drop old function
DROP FUNCTION IF EXISTS public.classify_question_difficulty();

-- New: classify in batches using LIMIT
CREATE OR REPLACE FUNCTION public.classify_questions_batch(p_batch_size int DEFAULT 5000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
AS $$
DECLARE
  v_easy int := 0;
  v_hard int := 0;
  v_remaining int := 0;
BEGIN
  -- EASY classification (batch)
  WITH easy_ids AS (
    SELECT id FROM questions
    WHERE difficulty = 'Medium'
      AND (
        (LENGTH(question) < 150 AND question ~* '(which of the following|name the|is known as|full form|is called|define |what is the|si unit of|unit of|dimension of|chemical name|common name|stands for|is a type of|belongs to|the formula of)')
        OR LENGTH(question) < 80
        OR (LENGTH(question) < 200 AND question ~* '^which (of the following|one)')
      )
      AND NOT question ~* '(prove|derive|evaluate|integrate|differentiate|matrix|determinant)'
      AND COALESCE(exam, '') NOT ILIKE '%advanced%'
    LIMIT p_batch_size
  )
  UPDATE questions SET difficulty = 'Easy'
  WHERE id IN (SELECT id FROM easy_ids);
  GET DIAGNOSTICS v_easy = ROW_COUNT;

  -- HARD classification (batch)
  WITH hard_ids AS (
    SELECT id FROM questions
    WHERE difficulty = 'Medium'
      AND (
        exam ILIKE '%advanced%'
        OR (LENGTH(question) > 300 AND question ~* '(prove that|derive|evaluate the|if and only if|differential equation)')
        OR LENGTH(question) > 400
        OR question_type IN ('numerical', 'assertion_reason')
        OR (year IS NOT NULL AND year < 2005 AND LENGTH(question) > 200)
      )
    LIMIT p_batch_size
  )
  UPDATE questions SET difficulty = 'Hard'
  WHERE id IN (SELECT id FROM hard_ids);
  GET DIAGNOSTICS v_hard = ROW_COUNT;

  SELECT COUNT(*) INTO v_remaining FROM questions WHERE difficulty = 'Medium';

  RETURN jsonb_build_object(
    'success', true,
    'easy_classified', v_easy,
    'hard_classified', v_hard,
    'remaining_medium', v_remaining,
    'has_more', (v_easy + v_hard) > 0
  );
END;
$$;
