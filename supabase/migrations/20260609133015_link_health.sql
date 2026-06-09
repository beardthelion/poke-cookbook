-- Link-health tracking for automated dead-link hiding.
-- dead_streak: consecutive daily checks where the recipe's poke.com link returned
-- 404/410. Reset to 0 the moment the link responds. When it crosses the threshold
-- the daily maintenance job sets is_hidden=true and link_dead=true.
-- link_dead: marks a recipe hidden specifically because its link went dead, to
-- distinguish from abuse hides (flag_count>=5) and manual hides, and to scope
-- auto-restore (only link_dead recipes are auto-unhidden when their link returns).
alter table public.recipes add column if not exists dead_streak integer not null default 0;
alter table public.recipes add column if not exists link_dead boolean not null default false;
