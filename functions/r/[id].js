import {
  getRecipeById, pageDocument, htmlResponse, notFoundResponse,
  escapeHtml, catClass, isPlaceholderAuthor, SITE,
} from '../_lib/recipes.mjs';

export async function onRequest(context) {
  const id = context.params.id;
  let recipe;
  try {
    recipe = await getRecipeById(id);
  } catch (e) {
    return htmlResponse(pageDocument({
      title: 'Something went wrong — Poke Cookbook',
      description: 'Temporary error.',
      canonical: `${SITE}/r/${encodeURIComponent(id)}`,
      body: `<a class="back" href="/">← Poke Cookbook</a><h1>Something went wrong</h1><p class="desc">Try again in a moment, or <a href="/">browse all recipes →</a></p>`,
    }), 500, 0);
  }
  if (!recipe) return notFoundResponse('Recipe not found');

  const canonical = `${SITE}/r/${recipe.id}`;
  const created = new Date(recipe.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const authorHtml = recipe.author
    ? (isPlaceholderAuthor(recipe.author)
        ? `by ${escapeHtml(recipe.author)} · `
        : `by <a href="/u/${encodeURIComponent(recipe.author)}">${escapeHtml(recipe.author)}</a> · `)
    : '';

  const body = `
    <a class="back" href="/">← Poke Cookbook</a>
    <span class="badge ${catClass(recipe.category)}">${escapeHtml(recipe.category)}</span>
    <h1>${escapeHtml(recipe.title)}${recipe.is_official ? '<span class="official">🌴 official</span>' : ''}</h1>
    <p class="meta">${authorHtml}${recipe.vote_count} vote${recipe.vote_count === 1 ? '' : 's'} · added ${escapeHtml(created)}</p>
    <p class="desc">${escapeHtml(recipe.description)}</p>
    <a class="btn-poke" href="${escapeHtml(recipe.url)}" target="_blank" rel="noopener">Open in Poke →</a>
    <p class="foot">An unofficial community directory of recipes for <a href="https://poke.com" target="_blank" rel="noopener">Poke</a>. <a href="/">Browse all →</a></p>`;

  return htmlResponse(pageDocument({
    title: `${recipe.title} — Poke Cookbook`,
    description: recipe.description,
    canonical,
    ogType: 'article',
    body,
  }));
}
