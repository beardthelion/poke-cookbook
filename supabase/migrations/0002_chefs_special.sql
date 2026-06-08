-- Poke Cookbook migration: Chef's Special / Official recipes

-- 1. Add is_official column
alter table public.recipes add column if not exists is_official boolean not null default false;

-- 2. Widen URL constraint to allow both /r/ and /p/ URL patterns
alter table public.recipes drop constraint if exists recipes_url_check;
alter table public.recipes add constraint recipes_url_check
  check (url ~* '^https?://(www\.)?poke\.com/(r|p)/.+');

-- 3. Index on is_official for fast filtering
create index if not exists recipes_official_idx on public.recipes (is_official) where is_official = true;
