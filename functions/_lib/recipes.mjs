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
