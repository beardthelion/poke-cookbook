-- Optional poke.com/u/<handle> profile link for a recipe's author, captured by
-- scrape-recipe on submit. Nullable; existing rows stay null.
alter table public.recipes add column if not exists author_url text;
