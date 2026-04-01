-- Update classifier to work on ALL questions, not just Medium ones
-- This way we don't need to reset first
CREATE OR REPLACE FUNCTION public.classify_questions_batch(p_batch_size integer DEFAULT 5000)
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
  -- HARD classification: reclassify from Easy or Medium → Hard
  WITH hard_ids AS (
    SELECT id FROM questions
    WHERE difficulty IN ('Easy', 'Medium')
      AND (
        exam ILIKE '%advanced%'
        OR question ~* '(prove\s+that|derive\s+(an\s+)?expression|evaluate\s+the\s+integral|differential\s+equation|if\s+and\s+only\s+if|moment\s+of\s+inertia|potential\s+energy\s+function)'
        OR (LENGTH(question) > 250 AND (LENGTH(option_a) + LENGTH(option_b) + LENGTH(option_c) + LENGTH(option_d)) > 200)
        OR (question ~* '(given\s+that.*find|if.*and.*then.*find|calculate.*given|determine.*when.*and)' AND LENGTH(question) > 150)
        OR question_type IN ('numerical', 'assertion_reason')
        OR (LENGTH(question) > 350 AND question ~* '(=|\+|\-|\times|\div|\\frac|\\int|\\sum|\\sqrt|equation|formula|coefficient)')
        OR (subject = 'Physics' AND question ~* '(circuit.*resistor|carnot|lens.*mirror.*combination|magnetic\s+field.*moving|angular\s+momentum.*conservation)')
        OR (subject = 'Chemistry' AND question ~* '(mechanism|order\s+of\s+reaction|equilibrium\s+constant.*calculate|electrochemical\s+cell|coordination\s+number)')
        OR (subject = 'Mathematics' AND question ~* '(integrate|\\bdy/dx\\b|tangent.*normal.*curve|locus|eccentricity|skew\s+lines)')
        OR (subject = 'Biology' AND LENGTH(question) > 200 AND question ~* '(explain\s+the\s+mechanism|sequence\s+of\s+events|distinguish\s+between.*and.*with|comparative\s+account)')
      )
    LIMIT p_batch_size
  )
  UPDATE questions SET difficulty = 'Hard'
  WHERE id IN (SELECT id FROM hard_ids) AND difficulty != 'Hard';
  GET DIAGNOSTICS v_hard = ROW_COUNT;

  -- Reclassify overly-easy Hard questions back to Medium
  -- (Hard questions that are actually simple/short)
  WITH not_hard AS (
    SELECT id FROM questions
    WHERE difficulty = 'Hard'
      AND LENGTH(question) < 100
      AND COALESCE(exam, '') NOT ILIKE '%advanced%'
      AND question_type NOT IN ('numerical', 'assertion_reason')
      AND NOT question ~* '(prove|derive|evaluate|integrate|differentiate)'
    LIMIT p_batch_size
  )
  UPDATE questions SET difficulty = 'Medium'
  WHERE id IN (SELECT id FROM not_hard);

  -- EASY: reclassify from Medium → Easy (never demote Hard to Easy)
  WITH easy_ids AS (
    SELECT id FROM questions
    WHERE difficulty = 'Medium'
      AND (
        (LENGTH(question) < 80)
        OR (LENGTH(question) < 200 AND question ~* '(which\s+of\s+the\s+following\s+is|name\s+the|is\s+known\s+as|is\s+called|full\s+form\s+of|stands\s+for|the\s+formula\s+(of|for)|si\s+unit\s+of|unit\s+of|dimension\s+of|chemical\s+name|common\s+name|belongs\s+to|is\s+a\s+type\s+of|symbol\s+of|define\s|what\s+is\s+the\s+)')
        OR (LENGTH(question) < 150 AND question ~* '(true\s+or\s+false|identify\s+the|select\s+the\s+correct|choose\s+the\s+correct\s+option|pick\s+the\s+odd)')
        OR (LENGTH(question) < 120 AND (LENGTH(option_a) + LENGTH(option_b) + LENGTH(option_c) + LENGTH(option_d)) < 60)
        OR (subject = 'Biology' AND LENGTH(question) < 150 AND question ~* '(scientific\s+name|commonly\s+known|discovered\s+by|father\s+of|coined\s+by|proposed\s+by)')
        OR (subject = 'Chemistry' AND LENGTH(question) < 120 AND question ~* '(atomic\s+number|electronic\s+configuration|valency|hybridization\s+of|IUPAC\s+name\s+of|colour\s+of|oxidation\s+state)')
      )
      AND NOT question ~* '(prove|derive|evaluate|integrate|differentiate|matrix|determinant|differential\s+equation)'
      AND COALESCE(exam, '') NOT ILIKE '%advanced%'
    LIMIT p_batch_size
  )
  UPDATE questions SET difficulty = 'Easy'
  WHERE id IN (SELECT id FROM easy_ids);
  GET DIAGNOSTICS v_easy = ROW_COUNT;

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