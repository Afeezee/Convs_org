// Single Vercel Function that hosts the whole API. Using `hono/vercel` keeps
// cold starts low and function count at 1. Verify against current Hono docs
// when upgrading.

import { handle } from "hono/vercel";
import { app } from "../server/router.js";

export const config = { runtime: "nodejs" } as const;

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const PUT = handle(app);
export const OPTIONS = handle(app);
