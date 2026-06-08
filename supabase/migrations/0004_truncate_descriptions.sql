-- Trim existing descriptions longer than 200 chars
update public.recipes
set description = regexp_replace(substr(description, 1, 200), '\s+\S*$', '') || '…'
where char_length(description) > 200;

-- Tighten the constraint back down to 200 chars
alter table public.recipes drop constraint if exists recipes_description_check;
alter table public.recipes add constraint recipes_description_check
  check (char_length(description) between 1 and 205);  -- small buffer for the … char
