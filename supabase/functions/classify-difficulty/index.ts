import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") || "https://jeenie.website",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "classify";

    if (action === "reset") {
      // Reset all questions back to Medium for re-classification
      const { error } = await supabase
        .from("questions")
        .update({ difficulty: "Medium" })
        .neq("difficulty", "Medium");
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, message: "All questions reset to Medium" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "classify") {
      let totalEasy = 0, totalHard = 0;
      const maxIterations = body.max_iterations || 20;
      
      for (let i = 0; i < maxIterations; i++) {
        const { data, error } = await supabase.rpc("classify_questions_batch", { p_batch_size: 5000 });
        if (error) throw error;
        
        totalEasy += data.easy_classified || 0;
        totalHard += data.hard_classified || 0;
        
        if (!data.has_more) break;
      }

      // Get final distribution
      const { data: stats } = await supabase
        .from("questions")
        .select("difficulty")
        .eq("is_active", true);
      
      const distribution = { Easy: 0, Medium: 0, Hard: 0 };
      if (stats) {
        for (const q of stats) {
          distribution[q.difficulty as keyof typeof distribution] = 
            (distribution[q.difficulty as keyof typeof distribution] || 0) + 1;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          easy_total: totalEasy, 
          hard_total: totalHard,
          final_distribution: distribution,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "fix-chapters") {
      const { data, error } = await supabase.rpc("fix_chapter_batch_distribution");
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: classify, reset, fix-chapters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
