-- Additional hard classification pass for questions that are genuinely difficult
-- but weren't caught by keyword patterns. Uses option complexity + question structure.
WITH more_hard AS (
  SELECT id FROM questions
  WHERE difficulty = 'Medium'
    AND (
      -- Questions with very long options (all 4 options are substantial = application-based)
      (LENGTH(option_a) > 40 AND LENGTH(option_b) > 40 AND LENGTH(option_c) > 40 AND LENGTH(option_d) > 40 AND LENGTH(question) > 150)
      -- Physics computational: specific numeric calculations
      OR (subject = 'Physics' AND question ~* '(calculate|find the value|what is the magnitude|determine the|ratio of|maximum velocity|minimum speed|angular velocity|terminal velocity|escape velocity)')
      -- Chemistry calculations
      OR (subject = 'Chemistry' AND question ~* '(calculate the|molarity|normality|mole fraction|degree of dissociation|rate constant|activation energy|cell potential|standard electrode)')
      -- Math higher-order problems
      OR (subject = 'Mathematics' AND question ~* '(number of solutions|range of|domain of|maximum value|minimum value|area bounded|volume of revolution|sum of series|convergent|divergent)')
      -- Multi-condition problems
      OR (question LIKE '%if%' AND question LIKE '%then%' AND question LIKE '%find%' AND LENGTH(question) > 200)
    )
    AND COALESCE(exam, '') NOT ILIKE '%foundation%'
  LIMIT 10000
)
UPDATE questions SET difficulty = 'Hard'
WHERE id IN (SELECT id FROM more_hard);

-- Reclassify some Easy questions that are actually Medium
-- (short but require understanding, not just recall)
WITH promote_to_medium AS (
  SELECT id FROM questions
  WHERE difficulty = 'Easy'
    AND (
      -- Contains calculation keywords despite being short
      (question ~* '(calculate|find|determine|compute|evaluate|solve)' AND LENGTH(question) > 60)
      -- Physics/Math with equations
      OR (subject IN ('Physics', 'Mathematics') AND question ~* '(=|equation|formula)' AND LENGTH(question) > 80)
    )
  LIMIT 10000
)
UPDATE questions SET difficulty = 'Medium'
WHERE id IN (SELECT id FROM promote_to_medium);