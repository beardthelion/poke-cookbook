-- ============================================================
-- POKE COOKBOOK — Supabase schema
-- Paste this entire file into Supabase SQL Editor and Run.
-- Safe to re-run (uses IF NOT EXISTS / DROP-then-CREATE policies).
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Tables ----------

-- Public profile, auto-created on signup via trigger below.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  description text not null check (char_length(description) between 1 and 400),
  url text not null check (url ~* '^https?://(www\.)?poke\.com/r/.+'),
  category text not null,
  author text,
  vote_count integer not null default 0,
  flag_count integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists recipes_created_idx on public.recipes (created_at desc);
create index if not exists recipes_votes_idx on public.recipes (vote_count desc);
create index if not exists recipes_category_idx on public.recipes (category);

create table if not exists public.votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table if not exists public.flags (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- ---------- Auto-create profile on new user ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'preferred_username',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Vote-count maintenance ----------
create or replace function public.bump_vote_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.recipes set vote_count = vote_count + 1 where id = new.recipe_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.recipes set vote_count = greatest(0, vote_count - 1) where id = old.recipe_id;
    return old;
  end if;
  return null;
end; $$;

drop trigger if exists votes_count_trg on public.votes;
create trigger votes_count_trg
  after insert or delete on public.votes
  for each row execute function public.bump_vote_count();

-- ---------- Flag-count maintenance + auto-hide ----------
-- Threshold: 5 unique flags hides the recipe automatically.
create or replace function public.bump_flag_count()
returns trigger language plpgsql as $$
declare
  new_count integer;
begin
  if TG_OP = 'INSERT' then
    update public.recipes
       set flag_count = flag_count + 1,
           is_hidden = (flag_count + 1) >= 5
     where id = new.recipe_id
     returning flag_count into new_count;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.recipes
       set flag_count = greatest(0, flag_count - 1)
     where id = old.recipe_id;
    return old;
  end if;
  return null;
end; $$;

drop trigger if exists flags_count_trg on public.flags;
create trigger flags_count_trg
  after insert or delete on public.flags
  for each row execute function public.bump_flag_count();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.recipes  enable row level security;
alter table public.votes    enable row level security;
alter table public.flags    enable row level security;

-- Profiles: everyone reads, users update their own.
drop policy if exists "profiles readable"  on public.profiles;
drop policy if exists "profiles self upd"  on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
create policy "profiles self upd" on public.profiles for update using (auth.uid() = id);

-- Recipes: everyone reads non-hidden; anyone can submit; no updates/deletes from public.
drop policy if exists "recipes public read"    on public.recipes;
drop policy if exists "recipes insert auth"    on public.recipes;
drop policy if exists "recipes insert open"    on public.recipes;
drop policy if exists "recipes owner update"   on public.recipes;
drop policy if exists "recipes owner delete"   on public.recipes;
create policy "recipes public read" on public.recipes
  for select using (is_hidden = false);
create policy "recipes insert open" on public.recipes
  for insert with check (true);

-- Votes: users see their own votes; insert/delete only their own.
drop policy if exists "votes self read"   on public.votes;
drop policy if exists "votes self write"  on public.votes;
drop policy if exists "votes self delete" on public.votes;
create policy "votes self read"   on public.votes for select using (auth.uid() = user_id);
create policy "votes self write"  on public.votes for insert with check (auth.uid() = user_id);
create policy "votes self delete" on public.votes for delete using (auth.uid() = user_id);

-- Flags: users see their own; insert/delete only their own.
drop policy if exists "flags self read"   on public.flags;
drop policy if exists "flags self write"  on public.flags;
drop policy if exists "flags self delete" on public.flags;
create policy "flags self read"   on public.flags for select using (auth.uid() = user_id);
create policy "flags self write"  on public.flags for insert with check (auth.uid() = user_id);
create policy "flags self delete" on public.flags for delete using (auth.uid() = user_id);

-- ============================================================
-- Optional: seed a few example recipes (remove if not wanted).
-- ============================================================
-- insert into public.recipes (title, description, url, category) values
--   ('Morning brief at 7am', 'Summarizes calendar, weather, and top 3 emails.',
--    'https://poke.com/r/example', 'Productivity');
