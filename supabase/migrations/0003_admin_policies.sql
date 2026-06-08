-- Admin mode: allow anyone to update/delete recipes (gated by frontend password).
-- Security note: This is security-through-obscurity. Fine for low-stakes community sites.
-- If abuse ever happens, move admin actions to an Edge Function with proper auth.

drop policy if exists "recipes admin update" on public.recipes;
drop policy if exists "recipes admin delete" on public.recipes;
drop policy if exists "recipes admin read hidden" on public.recipes;

create policy "recipes admin update" on public.recipes
  for update using (true) with check (true);

create policy "recipes admin delete" on public.recipes
  for delete using (true);

-- Allow reading hidden recipes too (admin frontend filters them visually).
-- This effectively makes all recipes readable; combined with the existing
-- "recipes public read" policy (is_hidden = false), this is permissive.
-- To restrict: drop this policy and use an Edge Function for admin reads instead.
create policy "recipes admin read hidden" on public.recipes
  for select using (true);
