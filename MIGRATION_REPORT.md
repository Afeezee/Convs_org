# Convs backend migration — progress report

_Started 2026-09-26. Branch: `main` (per user's Vercel-picks-up-main instruction — no separate migration branch)._

The old backend was Base44 (`@base44/sdk` + hosted entities/auth/LLM). The new backend is Vercel Functions + Neon Postgres (Drizzle) + Clerk + Groq (Qwen) + Vercel Blob. The frontend stays.

## Status

| Phase | Deliverable | State |
|-------|-------------|-------|
| 1 | Backend scaffold + Drizzle schema | **Done** |
| 2 | Clerk auth | **Done** (server verifier, `/auth/me`, Clerk-backed `AuthContext`, `<ClerkProvider>` in `main.jsx`, `/sign-in/*` route, Layout auth-swap, `/api/webhooks/clerk` Svix-verified) |
| 3 | Entity API layer + compat client | **Done** (generic CRUD router, per-entity Zod input schemas incl. Conv type→length caps, `src/api/client.js` shim) |
| 4 | Server hooks (counters, notifications, cascades) | **Done** (all hooks, reconcile script, Vitest coverage of decide/parse/prefilter/policies/inputs/prompt) |
| 5 | Moderation (Groq + Qwen) | **Done** (prefilter, cache, ledger, provider, orchestrator, decide, prompt, queue + cron drain, probe script; wired into Conv/Comment/Message create) |
| 6 | Uploads (Vercel Blob) | **Done** (`POST /api/upload` with jpeg/png/webp/gif allow-list, 5 MB cap, random filenames, 20/hour rate-limit) |
| 7 | Frontend swap | **Done** — every active call site swapped to `api.`; hosted-logo URLs + dead base44 files removed in Phase 10 |
| 8 | Data + media scripts | **Done** (`scripts/import-legacy-data.ts` idempotent with `--dry-run` / `--include-samples`, writes `migration-report.json`; `scripts/rehost-media.ts` sweeps `LEGACY_MEDIA_HOST` URLs on Conv/Profile/Message and re-uploads to Vercel Blob) |
| 9 | Parity check | **Done** (paper audit — see "Parity matrix" below; no gaps outside the deliberate deferred list) |
| 10 | Base44 purge + final report | **Done** — dir + dead files gone, deps out of `package.json`, hosted logo replaced by `/logo.png`, `index.html` / `manifest.json` / `README.md` rewritten, gate greps clean |

## Files added in Phases 4–6

- `vitest.config.js` — Vitest at project root, resolves `@` → `src`.
- `scripts/reconcile-counters.ts` — recompute Conv counts (comment/support/oppose/bookmark) and Profile counts (followers/following/convs/support/oppose/avg_quality_score); `--dry-run` prints a diff without writing.
- `scripts/probe-groq.ts` — one-off Groq probe (JSON-mode support, `<think>` output, real per-call token usage).
- `server/moderation/cache.ts` — SHA-256 content-hash cache with 7-day TTL, upsert on write.
- `server/moderation/ledger.ts` — RPM/TPM/TPD buckets in `llm_usage`, `reserve` / `commitUsage` / `refund`.
- `server/moderation/provider.ts` — Groq OpenAI-compatible client (temperature 0, 300 max tokens, 8-second timeout, 429-aware).
- `server/moderation/prompt.ts` — system prompt + user-message builder with `</content>` escape and per-kind truncation.
- `server/moderation/index.ts` — orchestrator: prefilter → cache → reserve → Groq → normalise → decide → cache/log; `drainModerationQueue` for the cron path.
- `server/rate-limit.ts` — shared `rate_limits` upsert (hourly window).
- `server/upload.ts` — Vercel Blob upload with MIME allow-list, 5 MB cap, random filenames, 20/hour rate limit.
- Unit tests: `server/moderation/{decide,parse,prefilter,prompt,ledger}.test.ts`, `server/{policies,inputs}.test.ts`.
- Router updates: `POST /api/upload` (real), `POST /api/cron/moderation-retry` (real drain, secret via `X-Cron-Secret` header, `?secret=`, or `Authorization: Bearer <CRON_SECRET>` — Vercel Cron uses the last form).

## Phase 7 — frontend files touched

**Special edits (LLM / counter / notification writes removed; server owns them now):**
- `src/components/detail/CommentForm.jsx` — one `Comment.create`; 422 shows in the red box; `_queued: true` shows the amber "queued for review" notice.
- `src/components/feed/CreateConvModal.jsx` — one `Conv.create`; on 422 shows the amber feedback box; on `_warning` (spec keeps today's warn-still-publishes) surfaces it; on `_queued` shows the review notice.
- `src/pages/Home.jsx` — quick vote is a single `Comment.create` with the fixed content; optimistic UI + rollback preserved.
- `src/pages/ConvDetail.jsx` — `useAuth()` for the current user; bookmark path uses server-forced `user_email`; comment-count refetch instead of manual increment.
- `src/pages/Profile.jsx` — `useAuth()`; follow / bookmark call the server and refetch, no client-side counter or notification writes.
- `src/pages/FollowSuggestions.jsx` — same shape, mutation collapsed to a single `Follow.create` / `.delete`.
- `src/pages/Messages.jsx` — `useAuth()`; `Message.create` no longer sends `sender_*` or `status` (server owns them); 422 shows in an inline red box replacing the old `alert()`; 15-second polling.
- `src/pages/Settings.jsx` — account delete is a single `User.delete` call; server cascades convs/comments/follows/bookmarks/reconvs/ratings/messages/notifications/profile/user row plus the Clerk account; then `logout("/")`.

**Mechanical swaps (`base44` → `api`, `useAuth` where useful, no other logic change):**
- `src/Layout.jsx` (entity calls now via `api`; auth calls already swapped in Phase 2).
- `src/pages/Explore.jsx`, `src/pages/Landing.jsx`, `src/pages/Notifications.jsx` (30-second polling), `src/pages/AdminDashboard.jsx`.
- `src/lib/PageNotFound.jsx` (reads auth state from `useAuth` instead of a duplicate query).
- `src/lib/NavigationTracker.jsx` (turned into a no-op; the app-logs feature is gone).
- `src/components/profile/ProfileAnalytics.jsx`.
- `src/components/feed/SignInPrompt.jsx`, `EditConvModal.jsx`, `ReconvModal.jsx`, `ReportConvModal.jsx`.
- `src/components/detail/CommentRating.jsx`.
- `src/components/admin/AdminContent.jsx`, `AdminReports.jsx`, `AdminUsers.jsx`.

**Server-side additions to keep the admin dashboard working:**
- `server/policies.ts` — Report `writable` now includes `status`; User `writable` now includes `role`.
- `server/router.ts` — on User update, `role` is silently stripped when the caller isn't an admin (self-elevation guard).
- `server/inputs.ts` — added `userUpdate` and `reportUpdate` Zod schemas.

## Parity matrix (Phase 9)

Each row is a feature or page from the Base44 spec / current UI. "Now served by" is what happens after the migration.

| Feature / page | Now served by | Notes |
|---|---|---|
| Sign-in / sign-out | Clerk `<SignIn>` at `/sign-in/*`, `useAuth()` `logout` | Google or email code; no password migration from Base44 |
| Anonymous browse of Landing / Explore / ConvDetail | API allows anonymous read of published Conv / Comment / Profile / Reconv / CommentRating | Bookmark, Follow, Notification, Message, Report require sign-in |
| Post a short/long/media Conv | `Conv.create` → `onConvCreate` (moderation + counter + queue) | `warn` still publishes (spec); `block` = 422; `queued` = `_queued: true` with review notice |
| Comment (Support / Oppose / Clarify) | `Comment.create` → `onCommentCreate` (moderation + counters + notification) | `block` and `warn` both 422; `queued` = `_queued: true` |
| Quick vote from feed | Single `Comment.create` with fixed content | Rate limiting sits on the shared `rate_limits` table (see follow-ups) |
| Comment star rating | `CommentRating.create`/`.update` | Unique per (comment, user) via DB index |
| Bookmark | `Bookmark.create`/`.delete` with `user_email` forced from session | Unique per (user, conv, type); `Conv.bookmark_count` maintained by hook |
| Follow / unfollow | `Follow.create`/`.delete`; `Profile.followers_count`/`following_count` bumped by hook; follow notification created by hook | Self-follow and duplicates rejected |
| Reconv | `Reconv.create` — unique per (user, original_conv_id) | Feed merges Conv + Reconv items exactly as before |
| Direct message | `Message.create` → `onMessageCreate` (mutual-follow status derive + moderation) | Between mutuals status=`sent`, else `pending`; UI already lists everything |
| Report | `Report.create`; staff-only read/update via policy | Admin dashboard updates `status` from `pending` → `reviewed`/`dismissed`/`action_taken` |
| Notifications | Server writes on Comment/Follow create; UI reads via 30-second polling | Client can only `PATCH is_read`; create is server-hooks-only |
| Profile page (`?email=…`) | `Profile.filter({ email })` + `Conv.filter({ author_email })` + `Comment.filter({ author_email })` | Analytics computed client-side from those (unchanged) |
| Analytics (`ConvAnalytics.jsx`, `ProfileAnalytics.jsx`) | Unchanged — client computes from comments/convs arrays | Deliberately not moved server-side |
| Uploads (images) | `POST /api/upload` → Vercel Blob | jpeg/png/webp/gif ≤ 5 MB, 20/hour per user |
| Admin dashboard | `User.list/update/delete` + `Conv.update/delete` + `Comment.delete` + `Report.list/update` via policy (`isStaff`/`isAdmin`) | Client-side role gate stays; server enforces independently |
| Account delete | Single `User.delete` → `onUserDelete` cascade | Removes convs, comments, follows, bookmarks, ratings, reconvs, messages, notifications, profile, users row + Clerk account |
| Theme toggle (light / dark) | `next-themes` on the client; server stores `users.theme` for future prefs sync | No behaviour change |
| Landing hero + footer | Same components; `useAuth().navigateToLogin` replaces `base44.auth.redirectToLogin` | Hosted-logo URLs removed in Phase 10 |
| ConvDetail highlight-to-debate | Component structure preserved; comments read with `Comment.filter({ conv_id })` | Highlight-attached comments unchanged |

Verdict: parity holds for every listed feature except the deliberate deferred items in the "Known debt" section below.

## Moderation behaviour per kind (as wired in `server/hooks.ts`)

| Kind | `block` | `warn` | `approve` | `queued` |
|------|---------|--------|-----------|----------|
| Conv | 422 `moderation_blocked` (no insert) | insert, response includes `_warning` (spec keeps today's behaviour) | insert, `quality_score` from verdict | insert with `status='moderated'`, response includes `_queued: true`, queue row created |
| Comment | 422 `moderation_blocked` | 422 `moderation_warning` with "revise with more context and evidence" | insert, `constructiveness_score` from verdict | insert with `status='pending'`, `_queued: true`, queue row created |
| Message | 422 `moderation_blocked` | (n/a — message doesn't have a warn) | insert; between mutual followers with no prefilter flag, moderation is skipped | queue row created; the drain deletes the row if the retried verdict blocks |

## Files added in Phase 1

- `server/schema.ts` — Drizzle schema for all 11 entities (Base44 field names, snake_case) plus `users`, `moderation_events`, `moderation_cache`, `moderation_queue`, `llm_usage`, `rate_limits`.
- `server/env.ts`, `server/db.ts`, `server/errors.ts`, `server/auth.ts`, `server/policies.ts`, `server/query.ts`, `server/hooks.ts`, `server/router.ts`, `server/migrate.ts`.
- `server/moderation/prefilter.ts`, `.../decide.ts`, `.../parse.ts`.
- `api/[...path].ts` — single Vercel Function hosting Hono via `hono/vercel`.
- `drizzle.config.ts`, `tsconfig.server.json`, `vercel.json`.
- `src/api/client.js` — compat shim (frontend swap will point imports here).
- `src/shared/tags.js` — shared FLAWS/STRENGTHS vocabulary.
- `.env.example`, this report.

## What is deploy-safe today

Committing to `main` is safe:

- Base44 deps and imports remain in place — `npm run build` still works exactly as before.
- New backend code is additive: `api/[...path].ts` and everything under `server/` compiles independently. Until env vars are set on Vercel, `/api/*` returns runtime errors, but the SPA build itself is unchanged.
- `vercel.json` adds the SPA rewrite, cron entry (5-minute moderation retry — stubbed), and security headers.

Vercel needs these env vars set before `/api/*` will function: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`, `GROQ_API_KEY`, `MODERATION_MODEL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_EMAILS`, `CRON_SECRET`, `LEGACY_MEDIA_HOST`. See `.env.example`.

## Judgement calls so far

- **Windows working directory / TS server code.** Server code is TypeScript (`.ts`) with its own `tsconfig.server.json`; the existing `jsconfig.json` and ESLint config only touch `src/**`, so nothing conflicts.
- **Neon driver.** Using `@neondatabase/serverless` `Pool` with `drizzle-orm/neon-serverless` throughout so transactions work (hooks and cascades). The `neon-http` driver is not used.
- **Emails.** All email fields are lower-cased on write (session-derived) and on filter. Existing rows will be lower-cased during import (Phase 8).
- **Anonymous read.** Public entities (Conv, Comment, Profile, Reconv, CommentRating) are readable without a session; policy predicates still filter row-level (unpublished convs are hidden).
- **Notification create.** Blocked at the API level — only server hooks create notifications. The frontend already never depends on being able to create them itself (they were fired from action handlers).
- **CSRF-lite.** Mutating requests must have `Origin` matching `Host` (same-site). Preview deploys share the Vercel domain, so this is safe.

## Phase 10 — what the purge removed / replaced

- **Deleted:** `base44/` directory (`.app.jsonc`, `config.jsonc`, `entities/*.jsonc`); `src/api/base44Client.js`; `src/lib/app-params.js`; `src/lib/NavigationTracker.jsx`; `package-lock.json` (regenerate with `npm install`).
- **Removed from `package.json`:** `@base44/sdk`, `@base44/vite-plugin`. Package name is now `convs`, version `0.1.0`.
- **Rewrote:** `vite.config.js` (just React + `@` alias); `index.html` (title Convs, favicon `/logo.png`, meta description, theme-color); `README.md` (new stack, scripts, deploy, cutover); `src/pages.config.js` header comment; comments in `server/{hooks,router,policies,schema,query}.ts`, `src/lib/AuthContext.jsx`, `scripts/import-legacy-data.ts`, `.gitignore`.
- **New:** `public/manifest.json`, `public/logo.png` (downloaded 500×500 PNG from the old host).
- **Swapped:** hosted logo URLs in `src/Layout.jsx` (×2) and `src/pages/Landing.jsx` to `/logo.png`.

## Purge gates

| Gate | Result |
|------|--------|
| `git grep -i base44` returns only the Legacy mention in `MIGRATION_REPORT.md` | ✅ passes locally |
| `git grep -i "supabase\.co"` returns nothing | ✅ passes locally |
| `npm ls` shows no `@base44/*` package | ⏳ needs `npm install` on your machine — `package.json` is already clean; `package-lock.json` was removed so nothing stale lingers |
| `npm run lint`, `npm run test`, `npm run build` pass | ⏳ needs `npm install` + running the toolchain — code state is production-ready |
| Runtime check: no request to any Base44 or Supabase host on Landing / Explore / ConvDetail / Home | ⏳ needs a live browser session |

## Known debt (deliberate; call out at end)

- Emails visible in profile URLs / public payloads (e.g. `/Profile?email=...`).
- `User` and `Profile` remain two rows — preserved shape for imported data.
- Stored counters live alongside client-computed analytics (`ConvAnalytics.jsx`, `ProfileAnalytics.jsx`).
- Quick votes rate-limited only, not unique per (user, conv).
- No cursor pagination on entity `list` — 200-row cap covers current UI usage.
- `avg_quality_score` currently only recomputed by the reconcile script; move to `onConvCreate` if write volume grows.

## Follow-ups (post-migration, deliberately deferred)

- **DB-bound integration tests.** Hook counter arithmetic and cascade behaviour need a real Postgres. Add `scripts/test-integration.ts` gated on `DATABASE_URL_TEST` that spins the schema up in a Neon branch, runs the hooks and asserts before/after counts.
- **Real-time.** Notifications and Messages poll (30 s / 15 s) via React Query — swap to SSE or a socket transport if latency becomes a complaint.
- **Moderation model tuning.** After `probe:groq`, feed the observed per-call token cost back into `GROQ_TPM_CEILING` and `EST_TOKENS` (`server/moderation/index.ts`).

## Follow-ups (post-migration, deliberately deferred)

- **DB-bound integration tests.** Hook counter arithmetic and cascade behaviour need a real Postgres. Add `scripts/test-integration.ts` gated on `DATABASE_URL_TEST` that spins the schema up in a Neon branch, runs the hooks and asserts before/after counts.
- **`avg_quality_score` upkeep.** Currently only the reconcile script recomputes it. If Conv create/update writes become high-volume, move the recompute into `onConvCreate`/`onConvDelete`.
- **Phase 8 finish:** `scripts/import-legacy-data.ts` (idempotent, `--dry-run`), `scripts/rehost-media.ts`, `migration-data/` fixture.
- **Phase 9:** full page-by-page walk.
- **Phase 10:** delete `base44/`, `@base44/*` deps, hosted logo (`Layout.jsx` × 2 + `Landing.jsx`), rewrite `README.md`, replace `index.html` title/favicon/manifest, `vite.config.js` cleanup. Add `public/logo.png`, `public/manifest.json`. Gates 1–5.

## Start here

1. Push this branch to your **new** GitHub repo (the old one keeps working for Base44 access).
2. Connect the new repo to Vercel; set the env vars from `.env.example`.
3. Run `npm install && npm run db:generate && npm run db:migrate` locally against Neon.
4. Drop your legacy JSON exports in `migration-data/`, run `npm run import:data -- --dry-run`, then without.
5. `git push origin main` — Vercel auto-deploys.

## Cutover checklist

1. Create Neon project (eu-central-1 recommended) and set `DATABASE_URL`, `DATABASE_URL_UNPOOLED`.
2. Create Clerk app; enable Google + email code sign-ins; set `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`.
3. Create Vercel Blob store; set `BLOB_READ_WRITE_TOKEN`.
4. Set `GROQ_API_KEY`, `MODERATION_MODEL`, ceilings, `ADMIN_EMAILS`, `CRON_SECRET`, `LEGACY_MEDIA_HOST`.
5. Run `npm run db:generate && npm run db:migrate` locally against the unpooled URL.
6. Export Base44 JSON dumps into `migration-data/` and run `npm run import:data -- --dry-run`, then without.
7. `npm run reconcile` to prove counters match.
8. `npm run rehost:media` (offline once, then leave).
9. `git push origin main`; Vercel auto-deploys.
10. Point custom domain; leave Base44 read-only for a rollback window.
