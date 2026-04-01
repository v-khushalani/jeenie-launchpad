
CREATE OR REPLACE FUNCTION public.fix_chapter_batch_distribution()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_moved int := 0;
  v_chapter record;
  v_correct_grade int;
  v_current_batch record;
  v_target_batch record;
  v_target_chapter_id uuid;
  v_moved_count int;
  v_moves jsonb := '[]'::jsonb;
BEGIN
  -- Process each chapter
  FOR v_chapter IN
    SELECT c.id, c.chapter_name, c.subject, c.batch_id, b.exam_type, b.grade
    FROM chapters c
    JOIN batches b ON c.batch_id = b.id
    WHERE b.is_active = true
  LOOP
    -- Determine correct grade based on NCERT syllabus
    v_correct_grade := NULL;
    
    -- Physics mapping
    IF LOWER(v_chapter.subject) = 'physics' THEN
      IF LOWER(v_chapter.chapter_name) ~* '(units and measure|motion in a straight|motion in a plane|laws of motion|work.*(power|energy)|rotational|gravitation|mechanical properties|thermal properties|thermodynamics|kinetic theory|oscillation|waves|simple harmonic|physical world|fluid)' THEN
        v_correct_grade := 11;
      ELSIF LOWER(v_chapter.chapter_name) ~* '(electr|current electricity|magnet|electromagnetic|alternating|ray optic|wave optic|optic|dual nature|atoms|nucle|semiconductor|communication|capacitance)' THEN
        v_correct_grade := 12;
      END IF;
    END IF;

    -- Chemistry mapping
    IF LOWER(v_chapter.subject) = 'chemistry' THEN
      IF LOWER(v_chapter.chapter_name) ~* '(basic concepts|structure of atom|atomic structure|classification of elements|periodicity|chemical bonding|states of matter|thermodynamics|chemical thermodynamics|equilibrium|redox|hydrogen|s.block|p.block.*1[34]|organic.*basic|general organic|hydrocarbons|environmental chemistry)' THEN
        v_correct_grade := 11;
      ELSIF LOWER(v_chapter.chapter_name) ~* '(solid state|solutions|electrochemistry|chemical kinetics|surface chemistry|metallurgy|isolation of elements|p.block|d.and.f|d.block|transition|coordination|haloalkane|alcohol|phenol|ether|aldehyde|ketone|carboxylic|amine|nitrogen|biomolecule|polymer|chemistry in everyday|haloarene)' THEN
        v_correct_grade := 12;
      END IF;
    END IF;

    -- Mathematics mapping
    IF LOWER(v_chapter.subject) = 'mathematics' THEN
      IF LOWER(v_chapter.chapter_name) ~* '(^sets|trigonometric function|mathematical induction|complex number|quadratic|linear inequalit|permutation|combination|binomial|sequence|series|straight line|coordinate geometry|conic section|limits|derivatives$|mathematical reasoning|statistics|^probability$)' THEN
        v_correct_grade := 11;
      ELSIF LOWER(v_chapter.chapter_name) ~* '(inverse trigon|matri|determinant|continuity|differentiab|differentiation|application.*(deriv|integr)|integral|integration|area under|differential equation|vector|three dimensional|3d geometry|linear programming|probability.*(distrib|advanced)|circle|parabola|ellipse|hyperbola)' THEN
        v_correct_grade := 12;
      END IF;
    END IF;

    -- Biology mapping
    IF LOWER(v_chapter.subject) = 'biology' THEN
      IF LOWER(v_chapter.chapter_name) ~* '(living world|biological classification|plant kingdom|animal kingdom|morphology|anatomy.*plant|structural organisation|cell.*(unit|biology|structure)|biomolecule|cell.*(cycle|division)|transport in plant|mineral nutrition|photosynthesis|respiration in plant|plant growth|digestion|breathing|body fluid|circulation|excret|locomotion|neural|nervous|chemical coordination|endocrine)' THEN
        v_correct_grade := 11;
      ELSIF LOWER(v_chapter.chapter_name) ~* '(reproduction|sexual reproduction|human reproduction|reproductive health|inheritance|variation|genetics|molecular.*(basis|biology)|evolution|human health|disease|food production|microbes|biotechnology|organisms and population|ecology|ecosystem|biodiversity|environmental issue)' THEN
        v_correct_grade := 12;
      END IF;
    END IF;

    -- Skip if no mapping found or already correct
    IF v_correct_grade IS NULL OR v_chapter.grade = v_correct_grade THEN
      CONTINUE;
    END IF;

    -- Find target batch
    SELECT * INTO v_target_batch
    FROM batches
    WHERE exam_type = v_chapter.exam_type
      AND grade = v_correct_grade
      AND is_active = true
    LIMIT 1;

    IF v_target_batch IS NULL THEN
      CONTINUE;
    END IF;

    -- Find or create target chapter
    SELECT id INTO v_target_chapter_id
    FROM chapters
    WHERE LOWER(chapter_name) = LOWER(v_chapter.chapter_name)
      AND LOWER(subject) = LOWER(v_chapter.subject)
      AND batch_id = v_target_batch.id
    LIMIT 1;

    IF v_target_chapter_id IS NULL THEN
      INSERT INTO chapters (chapter_name, subject, batch_id, is_active)
      VALUES (v_chapter.chapter_name, v_chapter.subject, v_target_batch.id, true)
      RETURNING id INTO v_target_chapter_id;
    END IF;

    -- Move questions
    UPDATE questions
    SET batch_id = v_target_batch.id, chapter_id = v_target_chapter_id
    WHERE chapter_id = v_chapter.id;
    GET DIAGNOSTICS v_moved_count = ROW_COUNT;

    v_moved := v_moved + v_moved_count;

    v_moves := v_moves || jsonb_build_object(
      'chapter', v_chapter.chapter_name,
      'subject', v_chapter.subject,
      'from_grade', v_chapter.grade,
      'to_grade', v_correct_grade,
      'questions', v_moved_count
    );

    -- Deactivate empty source chapter
    IF v_moved_count > 0 THEN
      UPDATE chapters SET is_active = false
      WHERE id = v_chapter.id
        AND NOT EXISTS (SELECT 1 FROM questions WHERE chapter_id = v_chapter.id LIMIT 1);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_questions_moved', v_moved,
    'chapters_processed', jsonb_array_length(v_moves),
    'moves', v_moves
  );
END;
$$;
