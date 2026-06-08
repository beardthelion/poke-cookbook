-- Normalize poke.com recipe URLs on write so trivial variants of the same
-- link (http/https, www, tracking params, fragments, trailing slash, host
-- casing) collapse to one canonical form and the UNIQUE(url) constraint
-- rejects them as duplicates.
--
-- Note: this canNOT unify a recipe's hash URL (/r/OCbIWm91d0z) with a vanity
-- slug URL (/r/flight-deals-tracker) — Poke serves both as independent
-- canonical pages with no mapping between them. Those re-posts are caught by a
-- separate content (title+author) check in the frontend, not here.
--
-- The recipe path is preserved verbatim (case included): Poke IDs are
-- case-sensitive, so the path must not be lowercased.

create or replace function public.normalize_poke_url(raw text)
returns text language sql immutable as $$
  with extracted as (
    -- everything from the first /r/ or /p/ segment onward, query+fragment dropped
    select split_part(split_part(
             substring(btrim(raw) from '(?i)/(?:r|p)/.*$')
           , '#', 1), '?', 1) as path
  )
  select case
    when (select path from extracted) is null then btrim(raw)  -- not a recipe path; let CHECK reject it
    else 'https://poke.com' || rtrim((select path from extracted), '/ ')
  end;
$$;

create or replace function public.normalize_recipe_url()
returns trigger language plpgsql as $$
begin
  new.url := public.normalize_poke_url(new.url);
  return new;
end; $$;

drop trigger if exists recipes_normalize_url on public.recipes;
create trigger recipes_normalize_url
  before insert or update of url on public.recipes
  for each row execute function public.normalize_recipe_url();
