// Cloudflare Pages Function: proxies /api/* to Supabase Edge Functions
// Maps: pokecookbook.com/api/recipes?limit=5  →  <supabase>/functions/v1/recipes-api?limit=5

const SUPABASE_URL = 'https://hznlynnxfwmnxixxnjnl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nqyz_SiqdYd0fkWNEXyniw_TqmnDx2k';

// Map friendly path → Edge Function name
const ROUTES = {
  'recipes': 'recipes-api',
};

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);

  // params.path is an array like ['recipes'] or ['recipes', 'something']
  const segments = params.path || [];
  const first = segments[0];

  if (!first || !ROUTES[first]) {
    return new Response(
      JSON.stringify({ error: 'Not found', available: Object.keys(ROUTES) }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const functionName = ROUTES[first];
  const targetUrl = `${SUPABASE_URL}/functions/v1/${functionName}${url.search}`;

  const proxyResp = await fetch(targetUrl, {
    method: request.method,
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
    },
    body: request.method === 'GET' ? undefined : await request.text(),
  });

  // Clone response and add friendly CORS/caching headers
  const body = await proxyResp.text();
  return new Response(body, {
    status: proxyResp.status,
    headers: {
      'Content-Type': proxyResp.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
