# Deploying

Environment variables (both hosts): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (your final https origin), `EVENT_COOKIE_SECRET`, optionally `NEXT_PUBLIC_GOOGLE_AUTH=true`.
After the first deploy, add `https://YOUR-DOMAIN/auth/callback` to Supabase → Authentication → URL Configuration → Redirect URLs.

## Vercel (simplest)

1. Push the repo to GitHub and import it at https://vercel.com/new.
2. Add the environment variables above and deploy. Nothing else is required (`next build` is auto-detected).
3. Note: the free Hobby plan is for non-commercial use; check Vercel's terms before charging customers.

## Cloudflare (OpenNext adapter)

Cloudflare Workers/Pages free tier allows commercial use and has generous bandwidth.

1. Install the adapter and Wrangler:
   ```bash
   npm i -D @opennextjs/cloudflare wrangler
   ```
2. Add `wrangler.jsonc`:
   ```jsonc
   {
     "name": "occasions",
     "main": ".open-next/worker.js",
     "compatibility_date": "2025-01-01",
     "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
     "assets": { "directory": ".open-next/assets", "binding": "ASSETS" }
   }
   ```
3. Add `open-next.config.ts`:
   ```ts
   import { defineCloudflareConfig } from "@opennextjs/cloudflare";
   export default defineCloudflareConfig();
   ```
4. Add scripts to `package.json`:
   ```json
   "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
   "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
   ```
5. Set variables with `npx wrangler secret put EVENT_COOKIE_SECRET` and add the `NEXT_PUBLIC_*` values to a `.env.production` (they are inlined at build time) or the dashboard's build variables.
6. `npm run deploy`.

Notes: the OG image route bundles ~440 KB of fonts (`src/assets/fonts`); if you hit the Worker size limit, drop the Tamil or Sinhala font and fall back to Latin-only previews. The app uses plain `<img>` for photos, so no image-optimisation service is needed on either host. Next.js 16's `proxy.ts` is supported by recent OpenNext versions – if your version only supports `middleware`, rename the file to `src/middleware.ts` and export `middleware`.
