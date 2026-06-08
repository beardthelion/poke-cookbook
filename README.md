# Poke Cookbook — Setup Guide

A community-built hub for Poke recipes. Front-end + Supabase backend.

## What's in this repo
- `index.html` — the site (single file, no build step), plus `llms.txt`, `robots.txt`, `sitemap.xml`, `og-image.html`
- `functions/api/[[path]].js` — Cloudflare Pages Function proxying `/api/*` to the Supabase Edge Functions
- `supabase/migrations/` — database schema, RLS policies, triggers (apply in filename/timestamp order)
- `supabase/functions/` — the `recipes-api`, `scrape-recipe`, and `admin-action` Edge Functions
- `README.md` — this file

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a name, region close to you, and set a strong DB password.
2. Wait ~1 min for provisioning.

## 2. Run the schema

1. In the Supabase dashboard, open **SQL Editor** (left sidebar).
2. Run the files in `supabase/migrations/` in filename order (oldest timestamp first): paste each one, **Run**, then the next. Each should report "Success. No rows returned." All are idempotent, so re-running is safe. (If you have the Supabase CLI linked, `supabase db push` does this for you — see "Deploying with the CLI" below.)
3. Tables are now set up with RLS enabled.

## 3. Enable OAuth providers

### Google
1. **Authentication → Providers → Google** → toggle on.
2. Follow the Supabase link to the [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0 Client ID (type: Web application).
3. Add the **Authorized redirect URI** shown by Supabase (looks like `https://xxxx.supabase.co/auth/v1/callback`).
4. Copy the Client ID + Client Secret back into Supabase. Save.

### GitHub
1. **Authentication → Providers → GitHub** → toggle on.
2. Go to GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
3. Authorization callback URL = the same `/auth/v1/callback` URL from Supabase.
4. Copy Client ID + generate + copy Client Secret into Supabase. Save.

### Add your site URL
- **Authentication → URL Configuration → Site URL**: set this to wherever you deploy (e.g. `https://pokecookbook.com`). For local testing use `http://localhost:8000`.
- Under **Redirect URLs**, add both your production URL and any local dev URL you use.

## 4. Wire the frontend

Open `index.html`, find this block near the bottom:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace both with values from **Supabase → Project Settings → API**:
- **Project URL** → `SUPABASE_URL`
- **anon public** key → `SUPABASE_ANON_KEY`

The `anon` key is safe to expose in the browser — RLS policies do the real enforcement.

## 5. Deploy

Any static host works. Easiest options:

**Cloudflare Pages** (free, fast)
- Drag the folder into [pages.cloudflare.com](https://pages.cloudflare.com) or connect a GitHub repo.

**Netlify / Vercel**
- `netlify deploy` or drag-drop, or push to GitHub and connect.

**GitHub Pages**
- Push `index.html` to a repo, enable Pages in repo settings.

After deploy, go back to Supabase → **Authentication → URL Configuration** and make sure your live URL is listed in **Site URL** and **Redirect URLs**.

## Deploying with the CLI

The frontend (`index.html`, `functions/`) auto-deploys to Cloudflare Pages on push to `main`. The Supabase backend (`supabase/`) is deployed separately with the [Supabase CLI](https://supabase.com/docs/guides/cli).

One-time setup:

```bash
supabase login                              # opens a browser to authorize, or paste a personal access token
supabase link --project-ref hznlynnxfwmnxixxnjnl   # prompts for the database password
```

The four migrations were originally applied by hand in the dashboard, so the remote migration history doesn't yet know about them. Tell it they're already applied (this records them without re-running the SQL):

```bash
supabase migration list                     # shows local vs remote; the four will show as local-only
supabase migration repair --status applied 20260414140001 20260414140002 20260414140003 20260414140004
```

After that, normal workflow:

```bash
supabase migration new <name>               # create a new migration, edit the generated file
supabase db push                            # apply pending migrations to the remote DB

supabase functions deploy                   # deploy all three edge functions
supabase functions deploy recipes-api       # or deploy just one
```

`verify_jwt = false` for all three functions is set in `supabase/config.toml`, matching their current deployment. The `ADMIN_PASSWORD` secret lives in the Supabase dashboard (Edge Functions → Secrets) and is not affected by deploys.

## How moderation works

- Anyone signed in can flag a recipe (one flag per user per recipe).
- After **5 unique flags**, the recipe is auto-hidden (`is_hidden = true`). RLS prevents hidden recipes from being fetched.
- To review flagged content, run this in SQL Editor:

```sql
select r.id, r.title, r.flag_count, r.url, r.created_at
from recipes r
where is_hidden = true
order by r.flag_count desc;
```

To un-hide something (e.g. a false-flag storm):

```sql
update recipes set is_hidden = false, flag_count = 0 where id = 'recipe-uuid-here';
```

Want to change the flag threshold? Edit the `5` in `bump_flag_count()` inside `supabase/migrations/20260414140001_initial_schema.sql` and re-run it.

## How "Hot" ranking works

Front-end only, purely visual: `vote_count / hours_since_post^0.6`. Tune the exponent in `hotScore()` in `index.html`:
- Higher (e.g. `0.8`) = newer posts rise faster
- Lower (e.g. `0.4`) = votes matter more, decay is slower

## Custom domain

In your host (Cloudflare Pages / Netlify / Vercel), add the custom domain, point DNS at them. Then add the new domain to Supabase's **Site URL / Redirect URLs**.

## What to consider adding later

- **Rate limiting on inserts** — edge function that checks submissions per user per hour
- **Search** — Postgres full-text index on `title + description`
- **Profile pages** — `/u/handle` showing a user's recipes
- **Comments** — add a `comments` table with same RLS pattern as flags/votes
- **Admin role** — a `profiles.is_admin` boolean + policy allowing update on `recipes.is_hidden`
- **Image preview** — og:image scraping via edge function on submit

## Troubleshooting

**Auth redirect loops or "Invalid redirect URL"**
→ Add the exact URL (with scheme, no trailing slash) to Supabase → Auth → URL Configuration → Redirect URLs.

**"new row violates row-level security policy"**
→ Usually means the user isn't signed in, or the `user_id` in the payload doesn't match `auth.uid()`. The frontend uses `state.user.id` which should match.

**Votes / flags aren't updating the counter**
→ Check the triggers in the schema. Re-run `supabase/migrations/20260414140001_initial_schema.sql` (it's idempotent).

**OAuth "redirect_uri_mismatch" from Google**
→ The callback URL in Google Cloud must match Supabase's exactly. Copy-paste from the Supabase provider settings.
