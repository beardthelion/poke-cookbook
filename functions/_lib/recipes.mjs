// Shared helpers for the server-rendered recipe/author/sitemap pages.
// Lives under _lib/ so Cloudflare Pages does not treat it as a route.

export const SUPABASE_URL = 'https://hznlynnxfwmnxixxnjnl.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_nqyz_SiqdYd0fkWNEXyniw_TqmnDx2k';
export const SITE = 'https://pokecookbook.com';

const PLACEHOLDER_AUTHORS = new Set(['poke team', 'community']);

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncate(s, n = 160) {
  const str = String(s ?? '').trim();
  if (str.length <= n) return str;
  const cut = str.slice(0, n);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

export function isPlaceholderAuthor(author) {
  return !author || PLACEHOLDER_AUTHORS.has(String(author).trim().toLowerCase());
}

// Only treat a stored author_url as linkable if it is an http(s) poke.com /u/ profile
// URL. author_url is attacker-writable (open submissions), so validate before rendering
// it as a clickable link, otherwise a javascript: value would be a stored XSS.
export function safeProfileUrl(url) {
  const s = String(url ?? '');
  return /^https?:\/\/(www\.)?poke\.com\/u\/[A-Za-z0-9_.\-]+/i.test(s) ? s : null;
}

// Display label for an author: "Name (@handle)" when a distinct friendly name is
// known, otherwise just the handle (no @). Empty handle yields empty string.
export function authorLabel(handle, displayName) {
  if (!handle) return '';
  const h = String(handle);
  return displayName && displayName !== h ? `${displayName} (@${h})` : h;
}

export function catClass(cat) {
  const map = {
    'Health':'cat-health','Developer':'cat-developer','Productivity':'cat-productivity',
    'Email':'cat-email','Calendar':'cat-calendar','Finance':'cat-finance','Shopping':'cat-shopping',
    'Travel':'cat-travel','Home':'cat-home','To-dos':'cat-todos','Community':'cat-community',
    'Sports':'cat-sports','Entertainment':'cat-entertainment','Research':'cat-research','News':'cat-news',
    'Creative':'cat-creative','Faith':'cat-faith','Real Estate':'cat-realestate','Food':'cat-food',
    'Style':'cat-style','Business':'cat-business','Power-ups':'cat-powerups'
  };
  return map[cat] || 'cat-other';
}

const RECIPE_COLS = 'id,title,description,url,category,author,author_url,author_handle,vote_count,is_official,created_at';

async function pgFetch(path, { nullOnStatus } = {}) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (nullOnStatus && resp.status === nullOnStatus) return null;
  if (!resp.ok) throw new Error(`PostgREST ${resp.status}`);
  return resp.json();
}

export async function getRecipeById(id) {
  // 400 means invalid UUID syntax; treat as not found rather than throwing
  const rows = await pgFetch(
    `recipes?id=eq.${encodeURIComponent(id)}&is_hidden=eq.false&select=${RECIPE_COLS}&limit=1`,
    { nullOnStatus: 400 }
  );
  return rows?.[0] ?? null;
}

export async function getRecipesByHandle(handle) {
  return pgFetch(
    `recipes?author_handle=eq.${encodeURIComponent(handle)}&is_hidden=eq.false&select=${RECIPE_COLS}&order=vote_count.desc`);
}

export async function getAuthorProfile(handle) {
  const rows = await pgFetch(
    `author_profiles?handle=eq.${encodeURIComponent(handle)}&select=display_name&limit=1`);
  return rows?.[0]?.display_name || null;
}

export async function getSitemapRows() {
  return pgFetch(`recipes?is_hidden=eq.false&select=id,author_handle&order=created_at.desc`);
}

const PAGE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#f4efe6;--bg-card:#fff;--ink:#1a1a1a;--ink-soft:#5c5c5c;--ink-faint:#9a9a94;--line:#e6dfd2;--accent:#ff5a1f;--accent-soft:#ffe7d6;--mint:#c8e6c9;--sky:#cfe3f7;--lemon:#fdecb0;--rose:#f6cfd0;--lilac:#ddd2f0;--peach:#ffd5b8}
body{background:var(--bg);color:var(--ink);font-family:'Inter Tight',system-ui,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}
.wrap{max-width:680px;margin:0 auto;padding:32px 20px 64px}
a{color:var(--ink);text-decoration:none}
a:hover{color:var(--accent)}
.back{display:inline-block;font-size:13px;color:var(--ink-faint);margin-bottom:24px}
h1{font-family:'Fraunces',serif;font-weight:500;font-size:32px;letter-spacing:-0.02em;line-height:1.15;margin:10px 0}
.badge{display:inline-block;font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px}
.official{font-style:italic;font-size:13px;color:var(--accent);margin-left:8px}
.desc{font-size:16px;color:var(--ink-soft);margin:16px 0}
.meta{font-size:13px;color:var(--ink-faint);margin-bottom:24px}
.meta a{color:var(--ink-soft);font-weight:500}
.btn-poke{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;font-weight:600;font-size:15px;padding:12px 20px;border-radius:12px}
.btn-poke:hover{color:#fff;filter:brightness(1.05)}
.cardlist{display:grid;gap:14px;margin-top:24px}
.rcard{background:var(--bg-card);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.rcard h3{font-family:'Fraunces',serif;font-weight:500;font-size:18px;margin-bottom:4px}
.rcard p{font-size:13px;color:var(--ink-soft)}
.foot{margin-top:48px;font-size:12px;color:var(--ink-faint)}
.cat-health{background:var(--mint);color:#2e5932}.cat-developer{background:var(--sky);color:#1f4872}
.cat-productivity{background:var(--lemon);color:#6b5608}.cat-email{background:var(--rose);color:#8a2e31}
.cat-calendar{background:var(--lilac);color:#4a3680}.cat-finance{background:var(--peach);color:#8a4420}
.cat-shopping{background:var(--mint);color:#2e5932}.cat-travel{background:var(--sky);color:#1f4872}
.cat-home{background:var(--lemon);color:#6b5608}.cat-todos{background:var(--rose);color:#8a2e31}
.cat-community{background:var(--accent-soft);color:#8a2e0b}.cat-sports{background:var(--mint);color:#2e5932}
.cat-entertainment{background:var(--lilac);color:#4a3680}.cat-research{background:var(--sky);color:#1f4872}
.cat-news{background:var(--peach);color:#8a4420}.cat-creative{background:var(--rose);color:#8a2e31}
.cat-faith{background:var(--lemon);color:#6b5608}.cat-realestate{background:var(--sky);color:#1f4872}
.cat-food{background:var(--peach);color:#8a4420}.cat-style{background:var(--rose);color:#8a2e31}
.cat-business{background:var(--sky);color:#1f4872}.cat-powerups{background:var(--accent-soft);color:#8a2e0b}
.cat-other{background:var(--line);color:var(--ink-soft)}
`;

export function pageDocument({ title, description, canonical, body, ogType = 'website' }) {
  const t = escapeHtml(title);
  const d = escapeHtml(truncate(description, 200));
  const c = escapeHtml(canonical);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${c}">
<meta property="og:type" content="${escapeHtml(ogType)}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${c}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${PAGE_CSS}</style>
</head>
<body><div class="wrap">${body}</div></body>
</html>`;
}

export function htmlResponse(html, status = 200, maxAge = 300) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': `public, max-age=${maxAge}` },
  });
}

export function notFoundResponse(message = 'Not found') {
  const body = `<a class="back" href="/">← Poke Cookbook</a>
    <h1>${escapeHtml(message)}</h1>
    <p class="desc">That page isn't in the cookbook. <a href="/">Browse all recipes →</a></p>`;
  return htmlResponse(pageDocument({
    title: `${message} — Poke Cookbook`,
    description: 'Page not found.',
    canonical: `${SITE}/`,
    body,
  }), 404, 60);
}
