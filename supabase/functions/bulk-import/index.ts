import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "https://jeenie.website",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function respond(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { action, data } = await req.json();
    console.log(`[BULK-IMPORT] Action: ${action}`);

    // ============ ACTION: seed_batch ============
    if (action === "seed_batch") {
      const { name, exam_type, grade, description } = data;
      const { data: batch, error } = await supabaseAdmin
        .from("batches")
        .insert({ name, exam_type, grade: grade || 12, is_active: true, is_free: false, description })
        .select("id, name")
        .single();
      if (error) return respond({ error: error.message }, 400);
      return respond({ success: true, batch });
    }

    // ============ ACTION: seed_chapters ============
    if (action === "seed_chapters") {
      const { chapters } = data;
      if (!chapters?.length) return respond({ error: "No chapters provided" }, 400);

      const { data: inserted, error } = await supabaseAdmin
        .from("chapters")
        .insert(chapters.map((ch: any, idx: number) => ({
          chapter_name: ch.chapter_name,
          subject: ch.subject,
          batch_id: ch.batch_id,
          chapter_number: ch.chapter_number || idx + 1,
          display_order: ch.chapter_number || idx + 1,
          is_active: true,
          is_free: false,
        })))
        .select("id, chapter_name, subject");

      if (error) return respond({ error: error.message }, 400);
      return respond({ success: true, inserted: inserted?.length || 0, chapters: inserted });
    }

    // ============ ACTION: bulk_import_questions ============
    if (action === "bulk_import_questions") {
      const { questions, batch_id } = data;
      if (!questions?.length) return respond({ error: "No questions provided" }, 400);

      // Load all chapters for this batch
      const { data: dbChapters } = await supabaseAdmin
        .from("chapters")
        .select("id, chapter_name, subject, batch_id")
        .eq("batch_id", batch_id);

      if (!dbChapters?.length) return respond({ error: "No chapters found for this batch" }, 400);

      // Build lookup maps
      const chaptersByExactName = new Map<string, typeof dbChapters[0]>();
      const chaptersBySubject = new Map<string, typeof dbChapters>();
      
      for (const ch of dbChapters) {
        chaptersByExactName.set(ch.chapter_name.toLowerCase().trim(), ch);
        const subj = ch.subject.toLowerCase();
        if (!chaptersBySubject.has(subj)) chaptersBySubject.set(subj, []);
        chaptersBySubject.get(subj)!.push(ch);
      }

      function findChapter(chapterName: string, subject: string) {
        const norm = chapterName.toLowerCase().trim();
        const exact = chaptersByExactName.get(norm);
        if (exact) return exact;

        const subjectChapters = chaptersBySubject.get(subject.toLowerCase()) || dbChapters || [];
        for (const ch of subjectChapters) {
          const cn = ch.chapter_name.toLowerCase();
          if (cn.includes(norm) || norm.includes(cn)) return ch;
        }

        const words = norm.split(/\s+/).filter((w: string) => w.length > 2);
        let best = { ch: null as any, score: 0 };
        for (const ch of subjectChapters) {
          const chWords = ch.chapter_name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
          const overlap = words.filter((w: string) => chWords.some((cw: string) => cw.includes(w) || w.includes(cw))).length;
          const score = overlap / Math.max(words.length, chWords.length, 1);
          if (score > best.score) best = { ch, score };
        }
        return best.score >= 0.3 ? best.ch : null;
      }

      let imported = 0;
      let skipped = 0;
      const skippedReasons: string[] = [];
      const batchInsert: any[] = [];

      for (const q of questions) {
        if (!q.question || !q.option_a || !q.option_b || !q.option_c || !q.option_d || !q.correct_option) {
          skipped++;
          skippedReasons.push(`Missing fields: ${q.question?.substring(0, 50) || 'empty'}`);
          continue;
        }

        const chapter = findChapter(q.chapter || "", q.subject || "Physics");
        if (!chapter) {
          skipped++;
          skippedReasons.push(`No chapter match: "${q.chapter}" (${q.subject})`);
          continue;
        }

        batchInsert.push({
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option.toUpperCase().replace('OPTION_', ''),
          explanation: q.explanation || null,
          subject: chapter.subject,
          chapter: chapter.chapter_name,
          chapter_id: chapter.id,
          batch_id: batch_id,
          topic: null,
          topic_id: null,
          difficulty: q.difficulty || "Medium",
          exam: q.exam || "JEE",
          year: q.year || null,
          is_active: true,
          is_verified: false,
          question_type: "single_correct",
        });
      }

      // Insert in batches of 500
      for (let i = 0; i < batchInsert.length; i += 500) {
        const chunk = batchInsert.slice(i, i + 500);
        const { error } = await supabaseAdmin.from("questions").insert(chunk);
        if (error) {
          console.error(`Insert error at batch ${i}:`, error);
          return respond({ error: error.message, imported, skipped, skippedReasons: skippedReasons.slice(0, 20) }, 400);
        }
        imported += chunk.length;
      }

      console.log(`[BULK-IMPORT] Imported: ${imported}, Skipped: ${skipped}`);
      return respond({ success: true, imported, skipped, total: questions.length, skippedReasons: skippedReasons.slice(0, 50) });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);

  } catch (error) {
    console.error("Bulk import error:", error);
    return respond({ error: (error as Error).message }, 500);
  }
});
