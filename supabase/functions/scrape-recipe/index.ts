// Supabase Edge Function: scrape-recipe
// Fetches a poke.com/r/ URL and extracts title, description, and author.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Decode common HTML entities that show up in og:description etc.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || !/^https?:\/\/(www\.)?poke\.com\/(r|p)\/.+/i.test(url)) {
      return new Response(JSON.stringify({ error: "Invalid Poke recipe URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PokeCookbook/1.0)" },
    });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Recipe not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await resp.text();

    const pick = (patterns: RegExp[]): string => {
      for (const re of patterns) {
        const m = html.match(re);
        if (m && m[1]) return decodeEntities(m[1].trim());
      }
      return "";
    };

    let title = pick([
      /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
      /<title>([^<]+)<\/title>/i,
    ]);
    title = title.replace(/\s*[–—-]\s*Poke\s*$/i, "").trim();

    const description = pick([
      /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
    ]);

    // Author extraction — try several patterns since Poke's HTML might vary.
    let author = "";

    // First, strip scripts/styles so we don't match inside them
    const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                          .replace(/<style[\s\S]*?<\/style>/gi, '');

    const authorPatterns: RegExp[] = [
      // og:author or article:author meta tags
      /<meta\s+(?:property|name)=["'](?:og:author|article:author|author)["']\s+content=["']([^"']+)["']/i,
      // Profile link /u/username
      /href=["'][^"']*\/u\/([A-Za-z0-9_.\-]+)["']/i,
      // "By" followed by any tags/whitespace, then a name (supports multi-word names with spaces)
      /By[\s<>\/a-z"'=:;.\-]{0,200}?>([A-Za-z0-9_.\- ]{2,60})</i,
      // "By" directly followed by a capitalized name with no space (ByBeardthelion) — single word
      />By([A-Z][A-Za-z0-9_.\-]{1,40})</,
      // "By" directly followed by a capitalized multi-word name (ByHarshit Khemani)
      />By([A-Z][A-Za-z0-9_.\-]+(?: [A-Z][A-Za-z0-9_.\-]+)+)/,
      // "By" with whitespace then name (supports multi-word names with spaces)
      />By\s+([A-Za-z0-9_.\-]+(?: [A-Za-z0-9_.\-]+)*)/i,
    ];

    for (const re of authorPatterns) {
      const m = cleanHtml.match(re);
      if (m && m[1]) {
        const candidate = decodeEntities(m[1].trim());
        const lower = candidate.toLowerCase();
        // Skip common false positives
        if (["poke", "made", "with", "the", "us"].includes(lower)) continue;
        if (candidate.length < 2) continue;
        author = candidate;
        break;
      }
    }

    return new Response(
      JSON.stringify({ title, description, author }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
