import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "https://jeenie.website",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── NCERT Grade Mapping ───────────────────────────────────
// true = Grade 11, false = Grade 12
const PHYSICS_GRADE_MAP: Record<string, number> = {
  // Grade 11 Physics
  "units and measurements": 11, "units and measurement": 11,
  "motion in a straight line": 11, "motion in a plane": 11,
  "laws of motion": 11, "work energy and power": 11, "work power energy": 11,
  "work power and energy": 11,
  "system of particles and rotational motion": 11, "rotational motion": 11,
  "rotational mechanics": 11,
  "gravitation": 11, "mechanical properties of solids": 11,
  "mechanical properties of fluids": 11, "fluid mechanics": 11,
  "thermal properties of matter": 11, "thermodynamics": 11,
  "kinetic theory": 11, "kinetic theory of gases": 11,
  "oscillations": 11, "waves": 11, "simple harmonic motion": 11,
  "physical world": 11,
  // Grade 12 Physics
  "electric charges and fields": 12, "electrostatics": 12,
  "electrostatic potential and capacitance": 12, "capacitance": 12,
  "current electricity": 12,
  "moving charges and magnetism": 12, "magnetism": 12,
  "magnetism and matter": 12,
  "electromagnetic induction": 12, "emi": 12,
  "alternating current": 12, "ac circuits": 12,
  "electromagnetic waves": 12,
  "ray optics and optical instruments": 12, "ray optics": 12, "optics": 12,
  "wave optics": 12,
  "dual nature of radiation and matter": 12, "dual nature": 12,
  "atoms": 12, "nuclei": 12, "atoms and nuclei": 12,
  "semiconductor electronics": 12, "semiconductors": 12,
  "communication systems": 12,
};

const CHEMISTRY_GRADE_MAP: Record<string, number> = {
  // Grade 11 Chemistry
  "some basic concepts of chemistry": 11, "basic concepts": 11,
  "structure of atom": 11, "atomic structure": 11,
  "classification of elements and periodicity": 11, "periodic table": 11,
  "periodicity in properties": 11,
  "chemical bonding and molecular structure": 11, "chemical bonding": 11,
  "states of matter": 11, "states of matter gases and liquids": 11,
  "chemical thermodynamics": 11, "thermodynamics": 11,
  "equilibrium": 11, "chemical equilibrium": 11, "ionic equilibrium": 11,
  "redox reactions": 11,
  "hydrogen": 11,
  "s block elements": 11, "s-block elements": 11,
  "p block elements group 13 and 14": 11,
  "organic chemistry some basic principles": 11, "general organic chemistry": 11,
  "goc": 11, "basic principles of organic chemistry": 11,
  "hydrocarbons": 11,
  "environmental chemistry": 11,
  // Grade 12 Chemistry
  "solid state": 12, "the solid state": 12,
  "solutions": 12,
  "electrochemistry": 12,
  "chemical kinetics": 12,
  "surface chemistry": 12,
  "general principles of isolation of elements": 12, "metallurgy": 12,
  "p block elements group 15 16 17 18": 12, "p block elements": 12,
  "d and f block elements": 12, "d block elements": 12, "transition elements": 12,
  "coordination compounds": 12, "coordination chemistry": 12,
  "haloalkanes and haloarenes": 12,
  "alcohols phenols and ethers": 12,
  "aldehydes ketones and carboxylic acids": 12, "carbonyl compounds": 12,
  "amines": 12, "organic compounds containing nitrogen": 12,
  "biomolecules": 12,
  "polymers": 12,
  "chemistry in everyday life": 12,
};

const MATH_GRADE_MAP: Record<string, number> = {
  // Grade 11 Math (JEE only)
  "sets": 11, "sets and functions": 11,
  "relations and functions": 11,
  "trigonometric functions": 11, "trigonometry": 11,
  "principle of mathematical induction": 11, "mathematical induction": 11,
  "complex numbers": 11, "complex numbers and quadratic equations": 11,
  "quadratic equations": 11,
  "linear inequalities": 11,
  "permutations and combinations": 11, "permutation and combination": 11,
  "binomial theorem": 11,
  "sequences and series": 11, "sequence and series": 11,
  "straight lines": 11, "coordinate geometry": 11,
  "conic sections": 11,
  "introduction to three dimensional geometry": 11, "3d geometry basics": 11,
  "limits and derivatives": 11, "limits": 11,
  "mathematical reasoning": 11,
  "statistics": 11,
  "probability": 11,
  // Grade 12 Math
  "relations and functions advanced": 12,
  "inverse trigonometric functions": 12,
  "matrices": 12, "matrix": 12,
  "determinants": 12,
  "continuity and differentiability": 12, "differentiation": 12,
  "application of derivatives": 12, "applications of derivatives": 12,
  "integrals": 12, "integration": 12, "indefinite integration": 12,
  "definite integration": 12,
  "application of integrals": 12, "applications of integrals": 12, "area under curves": 12,
  "differential equations": 12,
  "vector algebra": 12, "vectors": 12,
  "three dimensional geometry": 12, "3d geometry": 12,
  "linear programming": 12,
  "probability advanced": 12, "probability distribution": 12,
  "circle": 12, "parabola": 12, "ellipse": 12, "hyperbola": 12,
};

const BIOLOGY_GRADE_MAP: Record<string, number> = {
  // Grade 11 Biology (NEET only)
  "the living world": 11, "living world": 11,
  "biological classification": 11,
  "plant kingdom": 11,
  "animal kingdom": 11,
  "morphology of flowering plants": 11, "morphology": 11,
  "anatomy of flowering plants": 11, "plant anatomy": 11,
  "structural organisation in animals": 11,
  "cell the unit of life": 11, "cell biology": 11, "cell structure": 11,
  "biomolecules": 11,
  "cell cycle and cell division": 11, "cell division": 11,
  "transport in plants": 11,
  "mineral nutrition": 11,
  "photosynthesis in higher plants": 11, "photosynthesis": 11,
  "respiration in plants": 11, "plant respiration": 11,
  "plant growth and development": 11,
  "digestion and absorption": 11,
  "breathing and exchange of gases": 11, "respiration": 11,
  "body fluids and circulation": 11, "circulation": 11,
  "excretory products and their elimination": 11, "excretion": 11,
  "locomotion and movement": 11,
  "neural control and coordination": 11, "nervous system": 11,
  "chemical coordination and integration": 11, "endocrine system": 11,
  // Grade 12 Biology
  "reproduction in organisms": 12,
  "sexual reproduction in flowering plants": 12,
  "human reproduction": 12,
  "reproductive health": 12,
  "principles of inheritance and variation": 12, "genetics": 12,
  "molecular basis of inheritance": 12, "molecular biology": 12,
  "evolution": 12,
  "human health and disease": 12,
  "strategies for enhancement in food production": 12,
  "microbes in human welfare": 12,
  "biotechnology principles and processes": 12, "biotechnology": 12,
  "biotechnology and its applications": 12,
  "organisms and populations": 12, "ecology": 12,
  "ecosystem": 12,
  "biodiversity and conservation": 12, "biodiversity": 12,
  "environmental issues": 12,
};

function getGradeForChapter(chapterName: string, subject: string): number | null {
  const name = chapterName.toLowerCase().trim();
  const subj = subject.toLowerCase();

  if (subj === "physics" && PHYSICS_GRADE_MAP[name]) return PHYSICS_GRADE_MAP[name];
  if (subj === "chemistry" && CHEMISTRY_GRADE_MAP[name]) return CHEMISTRY_GRADE_MAP[name];
  if (subj === "mathematics" && MATH_GRADE_MAP[name]) return MATH_GRADE_MAP[name];
  if (subj === "biology" && BIOLOGY_GRADE_MAP[name]) return BIOLOGY_GRADE_MAP[name];

  // Fuzzy: check if chapter name contains any key
  const maps: Record<string, number>[] = [];
  if (subj === "physics") maps.push(PHYSICS_GRADE_MAP);
  else if (subj === "chemistry") maps.push(CHEMISTRY_GRADE_MAP);
  else if (subj === "mathematics") maps.push(MATH_GRADE_MAP);
  else if (subj === "biology") maps.push(BIOLOGY_GRADE_MAP);

  for (const map of maps) {
    for (const [key, grade] of Object.entries(map)) {
      if (name.includes(key) || key.includes(name)) return grade;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run || false;

    // 1. Fetch all batches
    const { data: batches, error: bErr } = await supabase
      .from("batches")
      .select("id, name, exam_type, grade")
      .eq("is_active", true);
    if (bErr) throw bErr;

    const batchMap: Record<string, any> = {};
    for (const b of batches || []) {
      const key = `${b.exam_type}_${b.grade}`;
      batchMap[key] = b;
    }

    // 2. Fetch all chapters
    const { data: chapters, error: cErr } = await supabase
      .from("chapters")
      .select("id, chapter_name, subject, batch_id");
    if (cErr) throw cErr;

    const moves: any[] = [];
    const chaptersToCreate: any[] = [];
    let questionsMovedTotal = 0;

    for (const chapter of chapters || []) {
      const correctGrade = getGradeForChapter(chapter.chapter_name, chapter.subject);
      if (!correctGrade) continue;

      // Determine current batch info
      const currentBatch = (batches || []).find(b => b.id === chapter.batch_id);
      if (!currentBatch) continue;
      if (currentBatch.grade === correctGrade) continue; // Already correct

      // Determine target batch
      const targetKey = `${currentBatch.exam_type}_${correctGrade}`;
      const targetBatch = batchMap[targetKey];
      if (!targetBatch) continue; // No target batch exists

      // Check if target chapter already exists in target batch
      const existingTarget = (chapters || []).find(
        c => c.chapter_name.toLowerCase() === chapter.chapter_name.toLowerCase()
          && c.subject.toLowerCase() === chapter.subject.toLowerCase()
          && c.batch_id === targetBatch.id
      );

      let targetChapterId: string;

      if (existingTarget) {
        targetChapterId = existingTarget.id;
      } else {
        // Create chapter in target batch
        if (!dryRun) {
          const { data: newChapter, error: ncErr } = await supabase
            .from("chapters")
            .insert({
              chapter_name: chapter.chapter_name,
              subject: chapter.subject,
              batch_id: targetBatch.id,
              is_active: true,
            })
            .select("id")
            .single();
          if (ncErr) {
            console.error(`Failed to create chapter ${chapter.chapter_name}:`, ncErr);
            continue;
          }
          targetChapterId = newChapter.id;
        } else {
          targetChapterId = "DRY_RUN";
        }
        chaptersToCreate.push({
          name: chapter.chapter_name,
          subject: chapter.subject,
          from_batch: currentBatch.name,
          to_batch: targetBatch.name,
        });
      }

      // Move questions from old chapter to target
      if (!dryRun) {
        const { count, error: updateErr } = await supabase
          .from("questions")
          .update({ batch_id: targetBatch.id, chapter_id: targetChapterId })
          .eq("chapter_id", chapter.id)
          .select("id");

        if (updateErr) {
          console.error(`Failed to move questions for ${chapter.chapter_name}:`, updateErr);
          continue;
        }

        const moved = count || 0;
        questionsMovedTotal += moved;

        moves.push({
          chapter: chapter.chapter_name,
          subject: chapter.subject,
          from: `${currentBatch.exam_type} Grade ${currentBatch.grade}`,
          to: `${targetBatch.exam_type} Grade ${correctGrade}`,
          questions_moved: moved,
        });

        // If old chapter now has 0 questions and differs from target, deactivate it
        if (moved > 0 && chapter.id !== targetChapterId) {
          const { count: remaining } = await supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("chapter_id", chapter.id);

          if ((remaining || 0) === 0) {
            await supabase
              .from("chapters")
              .update({ is_active: false })
              .eq("id", chapter.id);
          }
        }
      } else {
        moves.push({
          chapter: chapter.chapter_name,
          subject: chapter.subject,
          from: `${currentBatch.exam_type} Grade ${currentBatch.grade}`,
          to: `${targetBatch.exam_type} Grade ${correctGrade}`,
          questions_moved: "DRY_RUN",
        });
      }
    }

    // 3. Get final counts per batch
    const finalCounts: Record<string, number> = {};
    for (const b of batches || []) {
      const { count } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("batch_id", b.id);
      finalCounts[`${b.exam_type} Grade ${b.grade} (${b.name})`] = count || 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        chapters_moved: moves.length,
        chapters_created: chaptersToCreate.length,
        questions_moved: questionsMovedTotal,
        moves,
        new_chapters: chaptersToCreate,
        final_counts: finalCounts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
