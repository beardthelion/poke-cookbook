import { getSitemapRows, isPlaceholderAuthor, SITE } from './_lib/recipes.mjs';

export async function onRequest() {
  let rows;
  try {
    rows = await getSitemapRows();
  } catch (e) {
    rows = [];
  }
  const handles = new Set();
  for (const r of rows) {
    if (r.author_handle && !isPlaceholderAuthor(r.author_handle)) handles.add(r.author_handle);
  }
  const urls = [
    `${SITE}/`,
    `${SITE}/llms.txt`,
    ...rows.map(r => `${SITE}/r/${r.id}`),
    ...[...handles].map(h => `${SITE}/u/${encodeURIComponent(h)}`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
