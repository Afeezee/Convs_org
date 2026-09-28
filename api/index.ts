// Single Vercel Function that hosts the whole API. Reachable at /api/*
// via the rewrite in vercel.json. Hono does the method + path routing;
// this file just adapts the request/response for Vercel Functions.
//
// Kept as `api/index.ts` (not `api/[...path].ts`) because the bracket-
// catch-all filename convention isn't reliably detected on non-Next.js
// Vercel projects (framework: "vite"). The rewrite makes it explicit.

import { handle } from "hono/vercel";
import { app } from "../server/router.js";

export const runtime = "nodejs";

export default handle(app);
