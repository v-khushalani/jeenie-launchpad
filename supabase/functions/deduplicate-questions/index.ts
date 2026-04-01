import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "https://jeenie.website",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function dedupKey(question: string): string { 
  return question.toLowerCase().replace(/\s+/g, " ").trim().substring(0, 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Single-pass scan: fetch all questions ordered by created_at asc (oldest first).
    // First occurrence of each dedup key is kept; every later occurrence is a duplicate.
    const PAGE = 1000;
    let from = 0;
    let totalRows = 0;
    const keepByKey = new Map<string, string>(); // dedup_key → id to keep
    const deleteIds: string[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const row of data) {
        const key = dedupKey(row.question || "");
        if (!keepByKey.has(key)) {
          keepByKey.set(key, row.id);
        } else {
          deleteIds.push(row.id);
        }
      }

      totalRows += data.length;
      from += PAGE;
      if (data.length < PAGE) break;
    }

    // Delete duplicates in batches of 100
    const BATCH = 100;
    let deleted = 0;
    for (let i = 0; i < deleteIds.length; i += BATCH) {
      const batch = deleteIds.slice(i, i + BATCH);
      const { error } = await supabase.from("questions").delete().in("id", batch);
      if (error) throw error;
      deleted += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_scanned: totalRows,
        unique_questions: keepByKey.size,
        deleted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
