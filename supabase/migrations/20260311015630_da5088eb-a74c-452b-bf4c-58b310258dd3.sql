-- Fix 1: Add missing UPDATE policy on storage.objects for educator-content bucket
-- This is needed because nativeStorageUpload uses x-upsert: true header
CREATE POLICY "educators_can_update_files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'educator-content'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role, 'educator'::app_role])
  )
)
WITH CHECK (
  bucket_id = 'educator-content'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role, 'educator'::app_role])
  )
);

-- Fix 2: Improved difficulty classification function using multi-signal heuristics
-- Considers: question length, option complexity, subject-specific keywords, 
-- computational markers, multi-step indicators, NOT just raw length
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
  -- Reset ALL to Medium first (only on first call when nearly all are non-Medium, skip otherwise)
  -- This allows re-classification from scratch

  -- ═══════════════════════════════════════════════════════════════
  -- HARD classification (multi-signal scoring)
  -- ═══════════════════════════════════════════════════════════════
  WITH hard_ids AS (
    SELECT id FROM questions
    WHERE difficulty = 'Medium'
      AND (
        -- Signal 1: JEE Advanced questions are inherently harder
        exam ILIKE '%advanced%'
        -- Signal 2: Complex computation keywords
        OR question ~* '(prove\s+that|derive\s+(an\s+)?expression|evaluate\s+the\s+integral|differential\s+equation|if\s+and\s+only\s+if|moment\s+of\s+inertia|potential\s+energy\s+function)'
        -- Signal 3: Long question WITH long options (genuine complexity, not just verbose)
        OR (LENGTH(question) > 250 AND (LENGTH(option_a) + LENGTH(option_b) + LENGTH(option_c) + LENGTH(option_d)) > 200)
        -- Signal 4: Multi-step problems (multiple conditions/constraints)
        OR (question ~* '(given\s+that.*find|if.*and.*then.*find|calculate.*given|determine.*when.*and)' AND LENGTH(question) > 150)
        -- Signal 5: Numerical/assertion-reason type
        OR question_type IN ('numerical', 'assertion_reason')
        -- Signal 6: Very long questions with mathematical content
        OR (LENGTH(question) > 350 AND question ~* '(=|\\+|\\-|\\times|\\div|\\frac|\\int|\\sum|\\sqrt|equation|formula|coefficient)')
        -- Signal 7: Physics - circuit analysis, thermodynamic cycles, optics problems
        OR (subject = 'Physics' AND question ~* '(circuit.*resistor|carnot|lens.*mirror.*combination|magnetic\s+field.*moving|angular\s+momentum.*conservation)')
        -- Signal 8: Chemistry - reaction mechanisms, complex equilibrium
        OR (subject = 'Chemistry' AND question ~* '(mechanism|order\s+of\s+reaction|equilibrium\s+constant.*calculate|electrochemical\s+cell|coordination\s+number)')
        -- Signal 9: Math - integration, differential equations, 3D geometry
        OR (subject = 'Mathematics' AND question ~* '(integrate|\\bdy/dx\\b|tangent.*normal.*curve|locus|eccentricity|skew\s+lines)')
        -- Signal 10: Biology - complex application/analysis questions
        OR (subject = 'Biology' AND LENGTH(question) > 200 AND question ~* '(explain\s+the\s+mechanism|sequence\s+of\s+events|distinguish\s+between.*and.*with|comparative\s+account)')
      )
    LIMIT p_batch_size
  )
  UPDATE questions SET difficulty = 'Hard'
  WHERE id IN (SELECT id FROM hard_ids);
  GET DIAGNOSTICS v_hard = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════
  -- EASY classification (recall/definition/direct questions)
  -- ═══════════════════════════════════════════════════════════════
  WITH easy_ids AS (
    SELECT id FROM questions
    WHERE difficulty = 'Medium'
      AND (
        -- Signal 1: Very short, direct recall questions
        (LENGTH(question) < 80)
        -- Signal 2: Definition/naming/identification pattern (even if medium length)
        OR (LENGTH(question) < 200 AND question ~* '(which\s+of\s+the\s+following\s+is|name\s+the|is\s+known\s+as|is\s+called|full\s+form\s+of|stands\s+for|the\s+formula\s+(of|for)|si\s+unit\s+of|unit\s+of|dimension\s+of|chemical\s+name|common\s+name|belongs\s+to\s+(the\s+)?(family|class|order|phylum)|is\s+a\s+type\s+of|symbol\s+of|define\s|what\s+is\s+the\s+)')
        -- Signal 3: True/false style, simple identification
        OR (LENGTH(question) < 150 AND question ~* '(true\s+or\s+false|identify\s+the|select\s+the\s+correct|choose\s+the\s+correct\s+option|pick\s+the\s+odd)')
        -- Signal 4: Short options = simple conceptual  
        OR (LENGTH(question) < 120 AND (LENGTH(option_a) + LENGTH(option_b) + LENGTH(option_c) + LENGTH(option_d)) < 60)
        -- Signal 5: Biology nomenclature/taxonomy
        OR (subject = 'Biology' AND LENGTH(question) < 150 AND question ~* '(scientific\s+name|commonly\s+known|discovered\s+by|father\s+of|coined\s+by|proposed\s+by)')
        -- Signal 6: Chemistry basic facts
        OR (subject = 'Chemistry' AND LENGTH(question) < 120 AND question ~* '(atomic\s+number|electronic\s+configuration|valency|hybridization\s+of|IUPAC\s+name\s+of|colour\s+of|oxidation\s+state)')
      )
      -- Exclude if it has hard indicators despite being short
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