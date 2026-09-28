# Convs

Convs is an intellectual debate platform: short, long, or media convs; support
/ oppose responses with strength or flaw tags; live analytics; AI-moderated
discourse.

## Stack

- **Frontend:** Vite + React 18, React Router, TanStack Query, Tailwind + shadcn/ui, Recharts, Framer Motion. Single-page app.
- **Backend:** Vercel Functions (one catch-all handler), Hono router.
- **Database:** Neon Postgres, Drizzle ORM (`@neondatabase/serverless` `Pool` + `drizzle-orm/neon-serverless` for transactions).
- **Auth:** Clerk (`@clerk/clerk-react` on the client, `@clerk/backend` on the server; Svix-verified webhooks for lifecycle events).
- **Moderation:** Groq (OpenAI-compatible API) with a Qwen preview model, per `MODERATION_MODEL`. Deterministic prefilter → 7-day content-hash cache → shared RPM/TPM/TPD ledger → provider call → structured verdict → decision.
- **Uploads:** Vercel Blob (5 MB, jpeg/png/webp/gif, 20/hour/user).
- **Deploy:** Vercel — pushes to `main` deploy automatically.

## Local development

```bash
git clone <this repo>
cd convs
cp .env.example .env.local           # then fill in the values
npm install
npm run db:generate && npm run db:migrate
npm run dev                          # http://localhost:5173
```

`vite dev` handles the SPA. For the `/api/*` handler, use `vercel dev` (`npm i -g vercel`, then `vercel dev` from the project root) — that gives you the same routing as production.

### Environment variables

See `.env.example`. Neon connection strings (pooled + unpooled), Clerk (publishable + secret + webhook secret), Groq (API key + model + ceilings), Vercel Blob token, `ADMIN_EMAILS` (comma-separated verified addresses that boot with the `admin` role), `CRON_SECRET`, `LEGACY_MEDIA_HOST` (used only by `rehost:media`).

## Scripts

```
npm run dev           Vite dev server
npm run build         Production build
npm run lint          ESLint
npm run test          Vitest — pure-logic unit tests
npm run db:generate   Drizzle: generate migrations from server/schema.ts
npm run db:migrate    Apply migrations
npm run import:data   Idempotent import from migration-data/*.json
npm run rehost:media  Sweep old-host URLs → Vercel Blob
npm run reconcile     Recompute every denormalised counter
npm run probe:groq    One-off Groq behaviour probe (JSON mode, tokens, <think>)
```

## Deploy

- Push to `main`; Vercel builds and serves the SPA + Function.
- Set the env vars from `.env.example` in Vercel.
- `vercel.json` wires `/(?!api/)` to `index.html` (SPA), `/api/cron/moderation-retry` on `*/5 * * * *`, and basic security headers.

## Cutover checklist (one-off)

1. Create Neon project (eu-central-1 recommended). Copy the pooled URL to `DATABASE_URL`, the unpooled one to `DATABASE_URL_UNPOOLED`.
2. Create Clerk app; enable Google + email code sign-in; set `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`. Point the webhook at `https://<your-domain>/api/webhooks/clerk` (subscribe to `user.created`, `user.updated`, `user.deleted`).
3. Create Vercel Blob store; set `BLOB_READ_WRITE_TOKEN`.
4. Set `GROQ_API_KEY`, `MODERATION_MODEL`, RPM/TPM/TPD ceilings, `ADMIN_EMAILS`, `CRON_SECRET`, `LEGACY_MEDIA_HOST`.
5. `npm run db:generate && npm run db:migrate` locally against the unpooled URL.
6. Drop the legacy JSON dumps into `migration-data/` (gitignored). `npm run import:data -- --dry-run` first, then without.
7. `npm run reconcile` to prove counters match the source rows.
8. `npm run rehost:media` (once, offline; old URLs keep working until you do).
9. `git push origin main`; Vercel auto-deploys.
10. Point the custom domain; leave the old platform read-only for a rollback window before decommissioning.

## Layout

```
api/[...path].ts      Vercel Function hosting the Hono router
server/               env, db, auth, policies, hooks, moderation, upload, rate-limit
scripts/              import-legacy-data, rehost-media, reconcile-counters, probe-groq
drizzle/              generated migrations
public/               logo, manifest, favicon
src/                  the SPA (unchanged design; components, pages, shared/tags, api/client)
```

See `MIGRATION_REPORT.md` for the parity matrix, the moderation behaviour table, and the known-debt list.
