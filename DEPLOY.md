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

## Supabase Auth email setup

Sign-in uses a 6-digit email code, with the magic link kept as a fallback. Configure these in the Supabase dashboard before going live.

1. **Custom SMTP** (Authentication → Emails → SMTP Settings). The built-in sender only delivers to members of your Supabase organisation, so real users will never get their code without your own SMTP provider (Resend, Brevo, Amazon SES, Postmark…). Enable custom SMTP and enter the host, port, username, password and sender address.
2. **Raise the email rate limit** (Authentication → Rate Limits). The default is very low (a few emails per hour on the built-in sender). After enabling custom SMTP, increase "Rate limit for sending emails" to suit your traffic.
3. **Site URL and Redirect URLs** (Authentication → URL Configuration). Set Site URL to your production origin (`NEXT_PUBLIC_SITE_URL`) and add both redirect URLs:
   - `https://YOUR-DOMAIN/auth/callback`
   - `http://localhost:3000/auth/callback`
4. **Email templates** (Authentication → Emails → Templates). Add `{{ .Token }}` to both the **Magic Link** and **Confirm signup** templates (new users receive the Confirm signup template on their first sign-in). Sample HTML that shows the code large, with the link as a fallback:

   ```html
   <h2>Your sign-in code</h2>
   <p>Enter this 6-digit code to sign in:</p>
   <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 16px 0;">{{ .Token }}</p>
   <p>The code expires soon. If you did not request it, you can ignore this email.</p>
   <p>Or, if the code does not work, <a href="{{ .ConfirmationURL }}">click here to sign in</a>.</p>
   ```
