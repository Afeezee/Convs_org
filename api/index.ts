// Single Vercel Function that hosts the whole API. Reachable at /api/*
// via the rewrite in vercel.json. Hono does the method + path routing;
// this file just adapts the request/response for Vercel Functions.
//
// Named HTTP-method exports (GET/POST/…) are the Web-Fetch signature Vercel
// invokes on non-Next.js projects. A default export returning a Response is
// ignored (Vercel logs a warning and the request hangs). Named exports also
// let Vercel pick the right runtime behaviour per method.

import { handle } from "hono/vercel";
import { app } from "../server/router.js";

export const runtime = "nodejs";

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const PUT = handle(app);
export const OPTIONS = handle(app);
