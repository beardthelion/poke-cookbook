// Supabase Edge Function: admin-action
// Handles admin operations (update category, delete, unhide) with server-side password check.
// Password is stored as a Supabase secret (ADMIN_PASSWORD), never exposed to the frontend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Constant-time string comparison to prevent timing attacks
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { password, action, recipeId, category } = await req.json();

    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    if (!adminPassword) {
      return new Response(
        JSON.stringify({ error: "Admin not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || !safeEqual(password, adminPassword)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // verify action doesn't need a recipeId
    if (action !== "verify" && action !== "list_hidden") {
      if (!recipeId || typeof recipeId !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing recipeId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (action) {
      case "verify": {
        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_hidden": {
        const { data, error } = await supabase
          .from("recipes")
          .select("id,title,description,url,category,author,vote_count,created_at,is_official,is_hidden,flag_count")
          .eq("is_hidden", true);
        if (error) throw error;
        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_category": {
        if (!category || typeof category !== "string") {
          return new Response(
            JSON.stringify({ error: "Missing category" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const allowed = ["Calendar","Community","Developer","Email","Finance","Health","Home","Productivity","Scheduling","Shopping","Students","To-dos","Travel","Other"];
        if (!allowed.includes(category)) {
          return new Response(
            JSON.stringify({ error: "Invalid category" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("recipes")
          .update({ category })
          .eq("id", recipeId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { error } = await supabase
          .from("recipes")
          .delete()
          .eq("id", recipeId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unhide": {
        const { error: updateErr } = await supabase
          .from("recipes")
          .update({ is_hidden: false, flag_count: 0 })
          .eq("id", recipeId);
        if (updateErr) throw updateErr;
        const { error: flagsErr } = await supabase
          .from("flags")
          .delete()
          .eq("recipe_id", recipeId);
        if (flagsErr) throw flagsErr;
        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
