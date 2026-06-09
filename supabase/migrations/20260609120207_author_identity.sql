-- Canonical poke creatorName per recipe (handle for handle-users, else their name).
-- This is the author-page grouping key. Nullable; backfilled separately.
alter table public.recipes add column if not exists author_handle text;
create index if not exists recipes_author_handle_idx on public.recipes (author_handle);

-- Optional friendly display name per handle, curated by the admin path only.
create table if not exists public.author_profiles (
  handle text primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.author_profiles enable row level security;

-- Public read; no anon write policy, so writes happen only via the service role
-- (the admin-action Edge Function). Service role bypasses RLS.
drop policy if exists "author_profiles_public_read" on public.author_profiles;
create policy "author_profiles_public_read" on public.author_profiles
  for select using (true);
