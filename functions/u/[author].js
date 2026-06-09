import {
  getRecipesByAuthor, pageDocument, htmlResponse, notFoundResponse,
  escapeHtml, catClass, isPlaceholderAuthor, safeProfileUrl, SITE,
} from '../_lib/recipes.mjs';

export async function onRequest(context) {
  const author = decodeURIComponent(context.params.author);
  if (isPlaceholderAuthor(author)) return notFoundResponse('Author not found');

  let recipes;
  try {
    recipes = await getRecipesByAuthor(author);
  } catch (e) {
    return htmlResponse(pageDocument({
      title: 'Something went wrong — Poke Cookbook',
      description: 'Temporary error.',
      canonical: `${SITE}/u/${encodeURIComponent(author)}`,
      body: `<a class="back" href="/">← Poke Cookbook</a><h1>Something went wrong</h1><p class="desc"><a href="/">Browse all recipes →</a></p>`,
    }), 500, 0);
  }
  if (!recipes || recipes.length === 0) return notFoundResponse('Author not found');

  const canonical = `${SITE}/u/${encodeURIComponent(author)}`;
  const profile = recipes.map(r => safeProfileUrl(r.author_url)).find(Boolean) || null;
  const profileHtml = profile
    ? ` · <a href="${escapeHtml(profile)}" target="_blank" rel="noopener">View on Poke ↗</a>`
    : '';

  const cards = recipes.map(r => `
    <a class="rcard" href="/r/${r.id}">
      <span class="badge ${catClass(r.category)}">${escapeHtml(r.category)}</span>
      <h3>${escapeHtml(r.title)}</h3>
      <p>${escapeHtml(r.description)}</p>
    </a>`).join('');

  const body = `
    <a class="back" href="/">← Poke Cookbook</a>
    <h1>Recipes by ${escapeHtml(author)}</h1>
    <p class="meta">${recipes.length} recipe${recipes.length === 1 ? '' : 's'}${profileHtml}</p>
    <div class="cardlist">${cards}</div>
    <p class="foot">An unofficial community directory of recipes for <a href="https://poke.com" target="_blank" rel="noopener">Poke</a>. <a href="/">Browse all →</a></p>`;

  return htmlResponse(pageDocument({
    title: `Recipes by ${author} — Poke Cookbook`,
    description: `Poke recipes shared by ${author} on the Poke Cookbook.`,
    canonical,
    body,
  }));
}
