# Occasions

Multi-tenant web platform where Sri Lankan families create shareable event pages (weddings, homecomings, engagements, big girl parties, birthdays, baby showers, house warmings, dana) and send them on WhatsApp. English · සිංහල · தமிழ். Built to be light on slow data and readable by older relatives; runs on free tiers.

"Occasions" is a working name. **Rename it in one place: [src/config/site.ts](src/config/site.ts)** (brand name, domain, colours, languages, placeholder LKR prices).

**Stack:** Next.js (App Router) · TypeScript (strict) · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS, Storage) via `@supabase/ssr` · Zod · react-hook-form · `next/font` (Noto Sinhala/Tamil) · `next/og`. No paid APIs: maps are plain Google Maps links, sharing is `wa.me`.

## Quick start (no Supabase needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/demo – every template renders with hardcoded sample data, in all three languages.

## Setup with Supabase

1. Create a project at https://supabase.com (free tier).
2. In **SQL Editor**, run [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) (tables, RLS policies, helper functions, storage bucket `event-photos`).
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `..._ANON_KEY`) (Project Settings → API)
   - `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)
   - `EVENT_COOKIE_SECRET` (any long random string; required in production)
4. **Authentication → URL Configuration**: set Site URL to your `NEXT_PUBLIC_SITE_URL` and add `<site>/auth/callback` to Redirect URLs. Email magic links work out of the box. For Google sign-in, enable the Google provider and set `NEXT_PUBLIC_GOOGLE_AUTH=true`.
5. `npm run dev`, go to `/login`, sign in, create an event.
6. Optional sample data: sign up once, then run [supabase/seed.sql](supabase/seed.sql) in the SQL editor.
7. To try paid features before payments exist, change a user's plan in SQL: `update profiles set plan = 'standard' where email = 'you@example.com';`

### Security model (short)
- Owners can only read/write their own events and their children (RLS).
- The public can read **published** events and insert RSVPs/wishes only for published events.
- Guest tokens, password hashes and the guest list are never readable by the public: guests are resolved through `get_guest_by_token()`, passwords are verified inside Postgres (`verify_event_password()`, bcrypt).
- Because `password_hash` is hidden at column level, **never `select *` from `events`** – use `EVENT_COLUMNS` in [src/lib/events.ts](src/lib/events.ts).

## Project structure

```
src/
  config/site.ts          brand, domain, colours, languages, pricing (edit to rename)
  app/
    page.tsx              landing page (all 3 languages)
    demo/                 /demo gallery and /demo/[template] with sample data
    e/[slug]/             public event page, server actions, OG image
    login/ auth/callback/ magic-link auth
    dashboard/            owner area: list, new (wizard), [id] (edit, guests, rsvps, wishes)
    sitemap.ts robots.ts not-found.tsx proxy.ts (session refresh for owner routes)
  templates/              one file per template + registry.ts + create.tsx (shared factory)
  components/event/       shared guest-facing sections (countdown, timeline, RSVP, wishes…)
  components/dashboard/   editor, guest manager, wish moderation
  i18n/                   messages/<lang>/{common,event,dash,landing}.json + helpers
  lib/                    types, plans (free/premium gating), events data layer, validation (Zod),
                          storage (Supabase Storage behind a small interface), image compression
supabase/                 migrations + seed
```

## How to add a template

1. Create `src/templates/my-template.tsx`:
   ```tsx
   export const myTemplate = createTemplate({
     key: "my-template",
     occasions: ["birthday"],
     defaultTheme: { accent: "#0f766e", fontPair: "sans" },
     style: { bg: "#fff", fg: "#111", card: "#fff", muted: "#555", radius: "1rem", ornament: "✦" },
     Hero: ({ event, lang, dict, theme }) => <header>…</header>,
   });
   ```
   Only the hero is custom; all shared sections inherit the template's CSS variables.
2. Add **one line** to the `TEMPLATES` array in [src/templates/registry.ts](src/templates/registry.ts).
3. Add its name/description under `templates` in each `src/i18n/messages/<lang>/common.json`, and a sample in [src/lib/demo-data.ts](src/lib/demo-data.ts) (keyed by the template key) so it appears in `/demo`.

## How to add a language

1. Add `{ code: "xx", label: "…", short: "…" }` to `languages` in [src/config/site.ts](src/config/site.ts) and extend the `Lang` type there.
2. Copy `src/i18n/messages/en/*.json` to `src/i18n/messages/xx/` and translate (missing keys fall back to English).
3. Register the files in [src/i18n/index.ts](src/i18n/index.ts) and add a locale to `LOCALES`.
4. If the script needs a font, add it in [src/app/fonts.ts](src/app/fonts.ts) and the `.fp-*` stacks in `globals.css`.

## Scripts

`npm run dev` · `npm run build` · `npm run lint`. Deployment: see [DEPLOY.md](DEPLOY.md).

## Status

**Finished**
- Schema, RLS, storage policies, seed; env example; storage abstraction.
- Public event page: hero, live countdown, nekath timeline with per-item status, venue + maps link, gallery, RSVP, wishes, share (WhatsApp/copy), language toggle (cookie), personal guest links, password gate, unlisted mode, dynamic OG image (Sinhala/Tamil safe), metadata, reduced-motion support.
- 6 templates, registry, theme options (accent + font pair), demo routes.
- Dashboard: magic-link auth (Google optional), create/edit wizard with live preview, WebP compression, slug availability, guest list with bulk add + WhatsApp links, RSVP stats + CSV export, wish moderation, plan gating (no payments).
- Landing page in 3 languages, sitemap, robots, 404, accessibility pass.

**Stubbed / limited**
- No payments: `profiles.plan` is changed manually.
- Spam protection is a honeypot only; no rate limiting.
- Dashboard Sinhala/Tamil strings are partial (English fallback for the rest); the Sinhala/Tamil copy should be reviewed by a native speaker.
- Photos are a single size (≤1600px WebP); no thumbnails.
- No automated tests; the dashboard flow needs a live Supabase project to exercise.

**Next 5 recommended tasks**
1. Connect a Supabase project, run through the full flow (sign up → create → publish → RSVP) and fix anything found; add Playwright smoke tests.
2. Payments (PayHere / bank transfer flow) wired to `profiles.plan`.
3. Thumbnails/srcset for gallery images, and optionally move storage to Cloudflare R2 via `src/lib/storage`.
4. Rate limiting + Turnstile on RSVP/wish forms; email/WhatsApp notification to the owner on new RSVPs.
5. Native-speaker review of Sinhala/Tamil copy, complete dashboard translations, and add more templates (baby shower, house warming).
