import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

function getCorsHeaders(origin?: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function respond(body: any, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .trim();
}

function parsePlainTextOptions(optionsText: string) {
  const normalized = stripHtml(optionsText).replace(/\s+/g, " ").trim();
  if (!normalized || normalized.toLowerCase() === "none") return null;

  const matches = [...normalized.matchAll(/(?:^|\s)([A-D])(?=[\s).:-])/g)];
  if (matches.length < 4) return null;

  const byLabel: Partial<Record<"A" | "B" | "C" | "D", string>> = {};
  const markers = matches.slice(0, 4).map((match) => ({
    label: match[1] as "A" | "B" | "C" | "D",
    start: (match.index ?? 0) + match[0].length - 1,
  }));

  for (let i = 0; i < markers.length; i++) {
    const current = markers[i];
    const end = i < markers.length - 1 ? markers[i + 1].start : normalized.length;
    const chunk = normalized.slice(current.start, end).trim();
    byLabel[current.label] = chunk.replace(/^[A-D][\s).:-]*/, "").trim();
  }

  if (!byLabel.A || !byLabel.B || !byLabel.C || !byLabel.D) return null;
  return { a: byLabel.A, b: byLabel.B, c: byLabel.C, d: byLabel.D, correct: "A" };
}

function parseOptions(optionsHtml: string) {
  if (!optionsHtml) return null;
  try {
    const doc = new DOMParser().parseFromString(`<div>${optionsHtml}</div>`, "text/html");
    if (doc) {
      const items = doc.querySelectorAll("li");
      if (items.length >= 4) {
        const options: string[] = [];
        let correctLabel = "";
        for (let i = 0; i < Math.min(items.length, 4); i++) {
          const li = items[i] as Element;
          const labelEl = li.querySelector(".option-label");
          const dataEl = li.querySelector(".option-data");
          const label = labelEl?.textContent?.trim() || String.fromCharCode(65 + i);
          const text = stripHtml(dataEl?.innerHTML || li.textContent || "");
          options.push(text);
          if (li.classList?.contains("correct") || li.querySelector(".correct") || li.querySelector('svg[fill]')) {
            correctLabel = label;
          }
        }
        if (options.length >= 4) {
          return { a: options[0], b: options[1], c: options[2], d: options[3], correct: correctLabel || "A" };
        }
      }
    }
  } catch {
    // Fall back to plain-text parsing below.
  }

  return parsePlainTextOptions(optionsHtml);
}

function extractCorrectLetter(correctOption: string, options: { a: string; b: string; c: string; d: string }): string {
  if (!correctOption) return "A";
  const cleaned = stripHtml(correctOption).trim();
  if (/^[A-D]$/i.test(cleaned)) return cleaned.toUpperCase();
  const vals = [options.a, options.b, options.c, options.d];
  const letters = ["A", "B", "C", "D"];
  for (let i = 0; i < 4; i++) {
    if (vals[i] && cleaned.includes(vals[i].substring(0, 20))) return letters[i];
  }
  return "A";
}

function parseTags(tagsStr: string): string[] {
  if (!tagsStr) return [];
  try { return JSON.parse(tagsStr.replace(/'/g, '"')); }
  catch { return tagsStr.split(",").map((t: string) => t.trim().replace(/[[\]']/g, "")); }
}

function getExamType(tags: string[]): string {
  for (const tag of tags) {
    if (tag.includes("NEET") || tag.includes("AIPMT")) return "NEET";
    if (tag.includes("JEE")) return "JEE";
  }
  return "JEE";
}

function getYearFromTags(tags: string[]): number | null {
  for (const tag of tags) {
    const match = tag.match(/(\d{4})/);
    if (match) { const y = parseInt(match[1]); if (y >= 1990 && y <= 2030) return y; }
  }
  return null;
}

// ─── Skip reason helper ─────────────────────────────────────────────────
function addSkipReason(reasons: string[], reason: string, maxReasons = 200) {
  if (reasons.length < maxReasons) reasons.push(reason);
}

// ─── NCERT Grade Determination ─────────────────────────────────────────────
function determineGrade(chapterName: string, subject: string): number | null {
  const cn = chapterName.toLowerCase().trim();
  const subj = subject.toLowerCase();

  if (subj === "physics") {
    if (/^(units and measure|physical world|motion in a straight|motion in a plane|laws of motion|work.*(power|energy)|rotational|system of particles|gravitation|mechanical properties|thermal properties|thermodynamics|kinetic theory|oscillation|waves|simple harmonic|fluid)/.test(cn)
      || /\b(units|measurement|kinematics|friction|circular motion|centre of mass|elasticity|viscosity|surface tension|calorimetry|gas|shm)\b/.test(cn)) {
      return 11;
    }
    if (/\b(electr|coulomb|gauss|capacit|current electricity|ohm|kirchhoff|magnet|electromagnetic|alternating|ray optic|wave optic|optic|dual nature|photoelectric|atom|nuclei|nucle|semiconductor|communication|moving charges|magnetism)\b/.test(cn)) {
      return 12;
    }
  }

  if (subj === "chemistry") {
    if (/\b(basic concepts|structure of atom|atomic structure|classification of elements|periodicity|chemical bonding|states of matter|thermodynamics|chemical thermodynamics|equilibrium|redox|hydrogen|s.block|organic.*basic|general organic|hydrocarbons|environmental)\b/.test(cn)
      || /\b(mole concept|stoichiometry|periodic table|vsepr|molecular orbital)\b/.test(cn)) {
      return 11;
    }
    if (/\b(solid state|solutions|electrochemistry|chemical kinetics|surface chemistry|metallurgy|isolation|p.block|d.and.f|d.block|transition|coordination|haloalkane|haloarene|alcohol|phenol|ether|aldehyde|ketone|carboxylic|amine|biomolecule|polymer|chemistry in everyday)\b/.test(cn)) {
      return 12;
    }
  }

  if (subj === "mathematics") {
    if (/\b(^sets|trigonometric function|mathematical induction|complex number|quadratic|linear inequalit|permutation|combination|binomial|sequence|series|straight line|conic section|limits|derivatives$|mathematical reasoning|statistics|^probability$)\b/.test(cn)) {
      return 11;
    }
    if (/\b(inverse trigon|matri|determinant|continuity|differentiab|differentiation|application.*(deriv|integr)|integral|integration|area under|differential equation|vector|three dimensional|3d|linear programming)\b/.test(cn)) {
      return 12;
    }
  }

  if (subj === "biology") {
    if (/\b(living world|biological classification|plant kingdom|animal kingdom|morphology|anatomy.*plant|structural organisation|cell.*(unit|biology|structure)|biomolecule|cell.*(cycle|division)|transport in plant|mineral nutrition|photosynthesis|respiration in plant|plant growth|digestion|breathing|body fluid|circulation|excret|locomotion|neural|nervous|chemical coordination|endocrine)\b/.test(cn)) {
      return 11;
    }
    if (/\b(reproduction|sexual reproduction|human reproduction|reproductive health|inheritance|variation|genetics|molecular.*(basis|biology)|evolution|human health|disease|food production|microbes|biotechnology|organisms and population|ecology|ecosystem|biodiversity|environmental issue)\b/.test(cn)) {
      return 12;
    }
  }

  return null;
}

function buildChapterLookup(dbChapters: any[]) {
  const bySubject = new Map<string, any[]>();
  for (const ch of dbChapters) {
    const subj = ch.subject.toLowerCase();
    if (!bySubject.has(subj)) bySubject.set(subj, []);
    bySubject.get(subj)!.push(ch);
  }

  return function findChapter(chapterName: string, subject: string) {
    const norm = chapterName.toLowerCase().trim().replace(/&/g, "and");
    const pool = bySubject.get(subject.toLowerCase()) || dbChapters;
    for (const ch of pool) if (ch.chapter_name.toLowerCase().trim().replace(/&/g, "and") === norm) return ch;
    for (const ch of pool) {
      const cn = ch.chapter_name.toLowerCase().replace(/&/g, "and");
      if (cn.includes(norm) || norm.includes(cn)) return ch;
    }
    const words = norm.split(/[\s,\-&]+/).filter((w: string) => w.length > 2);
    let best = { ch: null as any, score: 0 };
    for (const ch of pool) {
      const chWords = ch.chapter_name.toLowerCase().replace(/&/g, "and").split(/[\s,\-&]+/).filter((w: string) => w.length > 2);
      const overlap = words.filter((w: string) => chWords.some((cw: string) => cw.includes(w) || w.includes(cw))).length;
      const score = overlap / Math.max(words.length, chWords.length, 1);
      if (score > best.score) best = { ch, score };
    }
    return best.score >= 0.3 ? best.ch : null;
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(origin) });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const {
      offset = 0,
      limit: requestedLimitRaw = 50,
      batch_id,
      jee_batch_id,
      neet_batch_id,
      batches: batchesParam,
      dataset = "datavorous/entrance-exam-dataset",
      dry_run = false,
      auto_paginate = false,
      max_pages = 2,
      create_missing_chapters = true,
    } = await req.json();

    const limit = Math.min(Math.max(Number(requestedLimitRaw) || 50, 1), 100);

    const batchMap = new Map<string, string>();
    const allBatchIds: string[] = [];

    if (batchesParam && Array.isArray(batchesParam)) {
      for (const b of batchesParam) {
        const key = `${b.grade}_${b.exam_type}`;
        batchMap.set(key, b.id);
        if (!allBatchIds.includes(b.id)) allBatchIds.push(b.id);
      }
    }

    if (allBatchIds.length === 0) {
      if (batch_id) allBatchIds.push(batch_id);
      if (jee_batch_id && !allBatchIds.includes(jee_batch_id)) allBatchIds.push(jee_batch_id);
      if (neet_batch_id && !allBatchIds.includes(neet_batch_id)) allBatchIds.push(neet_batch_id);
    }

    if (!allBatchIds.length) return respond({ error: "batches or batch_id required" }, 400);

    console.log(`[FETCH-IMPORT] Batches: ${allBatchIds.length}, Offset: ${offset}, EffectiveLimit: ${limit}, AutoPaginate: ${auto_paginate}`);

    const { data: dbChapters } = await supabaseAdmin
      .from("chapters")
      .select("id, chapter_name, subject, batch_id")
      .in("batch_id", allBatchIds);

    const allChapters = [...(dbChapters || [])];

    const { data: batchInfo } = await supabaseAdmin
      .from("batches")
      .select("id, grade, exam_type")
      .in("id", allBatchIds);

    if (batchMap.size === 0 && batchInfo) {
      for (const b of batchInfo) {
        const key = `${b.grade}_${b.exam_type}`;
        batchMap.set(key, b.id);
      }
    }

    const batchMeta = new Map<string, { grade: number; exam_type: string }>();
    if (batchInfo) {
      for (const b of batchInfo) batchMeta.set(b.id, { grade: b.grade, exam_type: b.exam_type });
    }

    const chaptersByBatch = new Map<string, any[]>();
    const finderByBatch = new Map<string, ReturnType<typeof buildChapterLookup>>();
    function rebuildFinders() {
      finderByBatch.clear();
      chaptersByBatch.clear();
      for (const ch of allChapters) {
        if (!chaptersByBatch.has(ch.batch_id)) chaptersByBatch.set(ch.batch_id, []);
        chaptersByBatch.get(ch.batch_id)!.push(ch);
      }
      for (const [bid, chs] of chaptersByBatch) {
        finderByBatch.set(bid, buildChapterLookup(chs));
      }
    }
    rebuildFinders();

    const SUBJECT_CORRECTIONS: Record<string, string> = {
      "current electricity": "Physics", "electrostatics": "Physics", "ray optics": "Physics",
      "magnetic effects of current": "Physics", "electromagnetic induction": "Physics",
      "alternating current": "Physics", "semiconductors": "Physics", "mechanical properties of fluids": "Physics",
      "waves and sound": "Physics", "rotational motion": "Physics", "electromagnetic waves": "Physics",
      "dual nature of matter": "Physics", "capacitance": "Physics", "oscillations": "Physics",
      "nuclear physics": "Physics", "motion in one dimension": "Physics", "motion in two dimensions": "Physics",
      "kinetic theory of gases": "Physics", "laws of motion": "Physics", "work power energy": "Physics",
      "gravitation": "Physics",
    };

    const createdChapterKeys = new Set<string>();
    let chaptersCreated = 0;

    let existingSet = new Set<string>();
    for (const bid of allBatchIds) {
      const { data: existing } = await supabaseAdmin
        .from("questions")
        .select("question")
        .eq("batch_id", bid)
        .limit(10000);
      for (const q of (existing || [])) {
        existingSet.add(q.question.substring(0, 100).toLowerCase().replace(/\s+/g, ""));
      }
    }

    let totalImported = 0;
    let totalSkipped = 0;
    let currentOffset = offset;
    let pagesProcessed = 0;
    let hasMore = true;
    const allSkippedReasons: string[] = [];
    // Track skip reason counts for summary
    const skipReasonCounts: Record<string, number> = {};

    function trackSkip(reason: string) {
      totalSkipped++;
      skipReasonCounts[reason] = (skipReasonCounts[reason] || 0) + 1;
      addSkipReason(allSkippedReasons, reason);
    }

    const datasetLower = dataset.toLowerCase();

    while (hasMore && pagesProcessed < (auto_paginate ? max_pages : 1)) {
      const hfUrl = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=default&split=train&offset=${currentOffset}&length=${limit}`;

      const hfRes = await fetch(hfUrl);
      if (!hfRes.ok) {
        const upstreamText = (await hfRes.text()).slice(0, 500);
        console.error(`[FETCH-IMPORT] HF error: ${hfRes.status} ${upstreamText}`);
        return respond({
          error: `HuggingFace rows request failed (${hfRes.status}). ${upstreamText}`,
          imported: totalImported,
          skipped: totalSkipped,
          chapters_created: chaptersCreated,
          pages_processed: pagesProcessed,
          next_offset: currentOffset,
          has_more: false,
          skippedReasons: allSkippedReasons.slice(0, 50),
          skipReasonCounts,
        }, 200, origin);
      }

      const hfData = await hfRes.json();
      const rows = hfData.rows || [];
      if (!rows.length) { hasMore = false; break; }

      const batchInsert: any[] = [];
      const seenThisPage = new Set<string>();

      for (const row of rows) {
        const r = row.row;
        if (!r) { trackSkip("Empty row"); continue; }

        let questionText = "";
        let optionA = "", optionB = "", optionC = "", optionD = "";
        let correctLetter = "A";
        let subject = "";
        let chapterTag = "";
        let examType = "JEE";
        let year: number | null = null;
        let explanation = "";

        // ─── KadamParth NCERT Science (6-10) FORMAT ─────────────────
        if (datasetLower.includes("kadamparth") || datasetLower.includes("ncert_science")) {
          // These are open-ended Q&A — skip non-MCQ rows
          const qType = (r.QuestionType || r.questionType || "").toLowerCase();
          if (qType !== "mcq") {
            trackSkip(`Not MCQ (${r.QuestionType || "General"})`);
            continue;
          }
          
          questionText = (r.Question || r.question || "").trim();
          const answer = (r.Answer || r.answer || "").trim();
          subject = (r.subject || "Science").trim();
          chapterTag = (r.Topic || r.topic || "General Science").trim();
          explanation = (r.Explanation || r.explanation || "").trim();
          
          // Try to parse MCQ answer that might contain options
          // Format might be "A) ... B) ... C) ... D) ..." or just the correct answer text
          const mcqParsed = parsePlainTextOptions(answer);
          if (mcqParsed) {
            optionA = mcqParsed.a; optionB = mcqParsed.b;
            optionC = mcqParsed.c; optionD = mcqParsed.d;
            correctLetter = mcqParsed.correct;
          } else {
            // Can't parse into 4 options
            trackSkip("Could not parse MCQ options from answer");
            continue;
          }

          // Determine exam type based on grade
          const grade = r.grade || 6;
          examType = `Foundation`;
          // For foundation, we need a foundation batch
          // Look for matching batch by grade
          const foundationKey = `${grade}_Foundation`;
          if (!batchMap.has(foundationKey)) {
            // Try Foundation-N format
            const altKey = `${grade}_Foundation-${grade}`;
            if (!batchMap.has(altKey)) {
              trackSkip(`No batch for grade ${grade}`);
              continue;
            }
          }

        } else if (datasetLower.includes("medmcqa")) {
          // ─── MedMCQA FORMAT ───────────────────────────────────────
          questionText = (r.question || "").trim();
          optionA = (r.opa || "").trim();
          optionB = (r.opb || "").trim();
          optionC = (r.opc || "").trim();
          optionD = (r.opd || "").trim();

          if (!optionA || !optionB || !optionC || !optionD) { trackSkip("Missing options"); continue; }

          const copIndex = typeof r.cop === "number" ? r.cop : parseInt(r.cop);
          correctLetter = ["A", "B", "C", "D"][copIndex] || "A";

          explanation = (r.exp || "").trim();

          const medSubject = (r.subject_name || "").toLowerCase();
          const medSubjectMap: Record<string, string> = {
            anatomy: "Biology", physiology: "Biology", biochemistry: "Chemistry",
            pathology: "Biology", pharmacology: "Biology", microbiology: "Biology",
            forensic_medicine: "Biology", "forensic medicine": "Biology",
            ent: "Biology", ophthalmology: "Biology", "preventive medicine": "Biology",
            psm: "Biology", "social & preventive medicine": "Biology",
            radiology: "Biology", anesthesia: "Biology", surgery: "Biology",
            medicine: "Biology", pediatrics: "Biology", gynaecology: "Biology",
            obstetrics: "Biology", psychiatry: "Biology", dermatology: "Biology",
            orthopaedics: "Biology", dental: "Biology", "skin": "Biology",
          };
          subject = medSubjectMap[medSubject] || "Biology";
          
          const medTopicToNcert: Record<string, string> = {
            anatomy: "Structural Organisation in Animals", skull: "Structural Organisation in Animals",
            "upper limb": "Locomotion and Movement", "lower limb": "Locomotion and Movement",
            osteology: "Locomotion and Movement", arthrology: "Locomotion and Movement",
            myology: "Locomotion and Movement", "head and neck": "Neural Control and Coordination",
            thorax: "Breathing and Exchange of Gases", abdomen: "Digestion and Absorption",
            pelvis: "Human Reproduction", neuroanatomy: "Neural Control and Coordination",
            embryology: "Human Reproduction", histology: "Structural Organisation in Animals",
            physiology: "Body Fluids and Circulation", "general physiology": "Cell The Unit of Life",
            "cardiovascular": "Body Fluids and Circulation", "blood": "Body Fluids and Circulation",
            "respiratory": "Breathing and Exchange of Gases", "renal": "Excretory Products and Their Elimination",
            "gi tract": "Digestion and Absorption", "gastrointestinal": "Digestion and Absorption",
            "endocrine": "Chemical Coordination and Integration", "nervous system": "Neural Control and Coordination",
            "muscle": "Locomotion and Movement", "reproductive": "Human Reproduction",
            biochemistry: "Biomolecules", "metabolism": "Biomolecules", "enzymes": "Biomolecules",
            "vitamins": "Biomolecules", "nutrition": "Mineral Nutrition", "proteins": "Biomolecules",
            "carbohydrates": "Biomolecules", "lipids": "Biomolecules", "nucleic acids": "Molecular Basis of Inheritance",
            pathology: "Human Health and Disease", "general pathology": "Human Health and Disease",
            "systemic pathology": "Human Health and Disease", inflammation: "Human Health and Disease",
            neoplasia: "Human Health and Disease", "hematology": "Body Fluids and Circulation",
            pharmacology: "Human Health and Disease", pharmacokinetics: "Human Health and Disease",
            pharmacodynamics: "Human Health and Disease", "autonomic nervous system": "Neural Control and Coordination",
            "cardiovascular pharmacology": "Body Fluids and Circulation", chemotherapy: "Human Health and Disease",
            microbiology: "Microbes in Human Welfare", bacteriology: "Microbes in Human Welfare",
            virology: "Microbes in Human Welfare", immunology: "Human Health and Disease",
            parasitology: "Human Health and Disease", mycology: "Microbes in Human Welfare",
            ophthalmology: "Neural Control and Coordination", ent: "Neural Control and Coordination",
            dermatology: "Structural Organisation in Animals", psychiatry: "Neural Control and Coordination",
            pediatrics: "Human Reproduction", obstetrics: "Human Reproduction",
            gynaecology: "Reproductive Health", surgery: "Human Health and Disease",
            medicine: "Human Health and Disease", orthopedics: "Locomotion and Movement",
            radiology: "Human Health and Disease", anesthesia: "Human Health and Disease",
            "forensic medicine": "Human Health and Disease", "preventive medicine": "Human Health and Disease",
            "community medicine": "Human Health and Disease", dental: "Digestion and Absorption",
            genetics: "Principles of Inheritance and Variation",
            "molecular biology": "Molecular Basis of Inheritance",
          };
          
          const rawTopic = (r.topic_name || r.subject_name || "").toLowerCase().trim();
          let mappedChapter = medTopicToNcert[rawTopic];
          if (!mappedChapter) {
            for (const [key, val] of Object.entries(medTopicToNcert)) {
              if (rawTopic.includes(key) || key.includes(rawTopic)) {
                mappedChapter = val;
                break;
              }
            }
          }
          chapterTag = mappedChapter || "Human Health and Disease";
          examType = "NEET";

        } else if (datasetLower.includes("sciq")) {
          // ─── SciQ FORMAT ──────────────────────────────────────────
          questionText = (r.question || "").trim();
          const correctAnswer = (r.correct_answer || "").trim();
          const d1 = (r.distractor1 || "").trim();
          const d2 = (r.distractor2 || "").trim();
          const d3 = (r.distractor3 || "").trim();

          if (!correctAnswer || !d1 || !d2 || !d3) { trackSkip("Missing options"); continue; }

          const correctSlot = Math.floor(Math.random() * 4);
          const distractors = [d1, d2, d3];
          const allOpts = [...distractors];
          allOpts.splice(correctSlot, 0, correctAnswer);
          optionA = allOpts[0]; optionB = allOpts[1]; optionC = allOpts[2]; optionD = allOpts[3];
          correctLetter = ["A", "B", "C", "D"][correctSlot];

          explanation = (r.support || "").trim();

          const qLower = questionText.toLowerCase();
          if (/\b(force|velocity|acceleration|energy|momentum|wave|electric|magnetic|circuit|optic|photon|gravity|newton|thermodynamic|heat|pressure|current|voltage|resistance)\b/.test(qLower)) {
            subject = "Physics";
          } else if (/\b(element|compound|reaction|acid|base|salt|molecule|ion|oxidation|reduction|bond|atom|electron|proton|periodic|organic|inorganic|metal|solution|pH|chemical)\b/.test(qLower)) {
            subject = "Chemistry";
          } else if (/\b(cell|gene|dna|rna|protein|organism|species|evolution|photosynthesis|respiration|enzyme|tissue|organ|bacteria|virus|ecology|ecosystem|chromosome|mitosis|meiosis|heredity|mutation)\b/.test(qLower)) {
            subject = "Biology";
          } else {
            subject = "Physics";
          }
          chapterTag = "General " + subject;
          examType = subject === "Biology" ? "NEET" : "JEE";

        } else {
          // ─── ENTRANCE-EXAM-DATASET FORMAT (default) ───────────────
          const tags = parseTags(r.tags || "");
          subject = tags[0] || "";
          chapterTag = tags[1] || "";
          examType = getExamType(tags);

          if (!["Physics", "Chemistry", "Mathematics", "Biology"].includes(subject)) {
            trackSkip(`Invalid subject: ${subject || "(empty)"}`);
            continue;
          }

          subject = SUBJECT_CORRECTIONS[chapterTag.toLowerCase().trim()] || subject;
          questionText = stripHtml(r.question || "");

          const parsed = parseOptions(r.options || "");
          if (!parsed) { trackSkip("Could not parse options"); continue; }
          optionA = parsed.a; optionB = parsed.b; optionC = parsed.c; optionD = parsed.d;

          correctLetter = parsed.correct;
          if ((!correctLetter || correctLetter === "A") && r.correct_option) {
            const fromCorrect = extractCorrectLetter(stripHtml(r.correct_option), parsed);
            if (fromCorrect) correctLetter = fromCorrect;
          }

          year = getYearFromTags(tags);
          explanation = stripHtml(r.answer || "").replace(/^The correct answer is:\s*/i, "");
        }

        // ─── COMMON VALIDATION ────────────────────────────────────────
        const correctedSubject = SUBJECT_CORRECTIONS[chapterTag.toLowerCase().trim()] || subject;
        if (!questionText || questionText.length < 10) { trackSkip("Question too short"); continue; }
        if (!["Physics", "Chemistry", "Mathematics", "Biology", "Science"].includes(correctedSubject)) {
          trackSkip(`Invalid subject: ${correctedSubject}`);
          continue;
        }

        const dedupKey = questionText.substring(0, 100).toLowerCase().replace(/\s+/g, "");
        if (existingSet.has(dedupKey) || seenThisPage.has(dedupKey)) { trackSkip("Duplicate"); continue; }
        seenThisPage.add(dedupKey);

        // ─── GRADE-AWARE BATCH ROUTING ───────────────────────────────
        const detectedGrade = determineGrade(chapterTag, correctedSubject);

        let targetExam = examType;
        if (correctedSubject === "Biology") targetExam = "NEET";
        if (correctedSubject === "Mathematics") targetExam = "JEE";

        let targetBatchId: string | undefined;

        if (batchMap.size > 0) {
          if (detectedGrade) {
            targetBatchId = batchMap.get(`${detectedGrade}_${targetExam}`);
          }
          if (!targetBatchId) {
            targetBatchId = batchMap.get(`12_${targetExam}`) || batchMap.get(`11_${targetExam}`);
          }
          if (!targetBatchId) {
            targetBatchId = allBatchIds[0];
          }
        } else {
          if (jee_batch_id && neet_batch_id) {
            targetBatchId = targetExam === "NEET" ? neet_batch_id : jee_batch_id;
          } else {
            targetBatchId = batch_id || jee_batch_id || neet_batch_id;
          }
        }

        if (!targetBatchId) { trackSkip("No matching batch"); continue; }

        const finder = finderByBatch.get(targetBatchId);
        let chapter = finder ? finder(chapterTag, correctedSubject) : null;

        if (!chapter) {
          for (const [bid, f] of finderByBatch) {
            if (bid === targetBatchId) continue;
            const meta = batchMeta.get(bid);
            if (meta && meta.exam_type === targetExam) {
              const found = f(chapterTag, correctedSubject);
              if (found) {
                chapter = found;
                targetBatchId = bid;
                break;
              }
            }
          }
        }

        const shouldCreateChapter = create_missing_chapters;
        if (!chapter && shouldCreateChapter && chapterTag && chapterTag.length > 1) {
          const chapterKey = `${targetBatchId}:${correctedSubject}:${chapterTag}`.toLowerCase();
          if (!createdChapterKeys.has(chapterKey)) {
            createdChapterKeys.add(chapterKey);
            const existingCount = allChapters.filter(
              c => c.batch_id === targetBatchId && c.subject.toLowerCase() === correctedSubject.toLowerCase()
            ).length;

            const { data: newChapter, error: chError } = await supabaseAdmin
              .from("chapters")
              .insert({
                chapter_name: chapterTag,
                subject: correctedSubject,
                batch_id: targetBatchId,
                chapter_number: existingCount + 1,
                is_active: true,
              })
              .select("id, chapter_name, subject, batch_id")
              .single();

            if (!chError && newChapter) {
              allChapters.push(newChapter);
              rebuildFinders();
              chapter = newChapter;
              chaptersCreated++;
            }
          } else {
            const updatedFinder = finderByBatch.get(targetBatchId);
            if (updatedFinder) chapter = updatedFinder(chapterTag, correctedSubject);
          }
        }

        if (!chapter) {
          trackSkip(`No chapter: "${chapterTag}" (${correctedSubject})`);
          continue;
        }

        batchInsert.push({
          question: questionText,
          option_a: optionA, option_b: optionB, option_c: optionC, option_d: optionD,
          correct_option: correctLetter,
          explanation: explanation || null,
          subject: chapter.subject,
          chapter: chapter.chapter_name,
          chapter_id: chapter.id,
          batch_id: chapter.batch_id,
          topic: null, topic_id: null,
          difficulty: "Medium",
          exam: targetExam,
          year: year,
          is_active: true, is_verified: false,
          question_type: "single_correct",
        });
      }

      // Insert
      if (!dry_run && batchInsert.length > 0) {
        for (let i = 0; i < batchInsert.length; i += 200) {
          const chunk = batchInsert.slice(i, i + 200);
          const { error } = await supabaseAdmin.from("questions").insert(chunk);
          if (error) {
            return respond({
              error: error.message, imported: totalImported, skipped: totalSkipped,
              current_offset: currentOffset, pages_processed: pagesProcessed,
              skippedReasons: allSkippedReasons.slice(0, 50),
              skipReasonCounts,
            }, 400);
          }
          totalImported += chunk.length;
          for (const q of chunk) {
            existingSet.add(q.question.substring(0, 100).toLowerCase().replace(/\s+/g, ""));
          }
        }
      } else if (dry_run) {
        totalImported += batchInsert.length;
      }

      currentOffset += rows.length;
      pagesProcessed++;
      hasMore = rows.length === limit;
    }

    return respond({
      success: true,
      dry_run,
      imported: totalImported,
      skipped: totalSkipped,
      chapters_created: chaptersCreated,
      pages_processed: pagesProcessed,
      next_offset: currentOffset,
      has_more: hasMore,
      skippedReasons: [...new Set(allSkippedReasons)].slice(0, 50),
      skipReasonCounts,
    });

  } catch (error) {
    console.error("[FETCH-IMPORT] Error:", error);
    return respond({ error: (error as Error).message }, 500);
  }
});
