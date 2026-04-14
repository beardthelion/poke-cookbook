// Supabase Edge Function: recipes-api
// Public read-only JSON API for agents, LLMs, and third-party integrations.
// GET-style via query params (supports both GET and POST).
//
// Query params:
//   ?category=Travel          (filter by category)
//   ?official=true            (only official recipes)
//   ?sort=hot|top|new         (default: hot)
//   ?limit=50                 (default 50, max 200)
//   ?q=search                 (search in title+description)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "public, max-age=60", // agents can cache for 1 min
};

// Hot score: votes / hours_since_post^0.6
function hotScore(r: any): number {
  const ageHours = Math.max(1, (Date.now() - new Date(r.created_at).getTime()) / 3600000);
  return r.vote_count / Math.pow(ageHours, 0.6);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const official = url.searchParams.get("official");
    const sort = url.searchParams.get("sort") || "hot";
    const limitRaw = parseInt(url.searchParams.get("limit") || "50", 10);
    const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 50 : limitRaw), 200);
    const q = url.searchParams.get("q")?.trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("recipes")
      .select("id,title,description,url,category,author,vote_count,created_at,is_official")
      .eq("is_hidden", false);

    if (category) query = query.eq("category", category);
    if (official === "true") query = query.eq("is_official", true);
    if (official === "false") query = query.eq("is_official", false);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

    // Fetch broadly, then sort and limit in memory to support hot scoring
    const { data, error } = await query.limit(500);
    if (error) throw error;

    let sorted = data || [];
    if (sort === "top") {
      sorted.sort((a, b) => b.vote_count - a.vote_count);
    } else if (sort === "new") {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      sorted.sort((a, b) => hotScore(b) - hotScore(a));
    }
    sorted = sorted.slice(0, limit);

    const response = {
      source: "pokecookbook.com",
      description: "Community-curated directory of recipes for Poke (poke.com), the AI agent platform.",
      count: sorted.length,
      sort,
      filters: { category, official, q },
      recipes: sorted.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        author: r.author || "Unknown",
        is_official: r.is_official,
        votes: r.vote_count,
        created_at: r.created_at,
        poke_url: r.url,
        cookbook_url: `https://pokecookbook.com/?r=${r.id}`,
      })),
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
