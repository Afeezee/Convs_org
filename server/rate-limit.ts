// Simple per-key rate limit backed by the `rate_limits` table so all
// serverless instances share the same window. Callers pass a key
// (`upload:<email>`, `quickvote:<email>`) and a limit-per-hour.

import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "./db";

const WINDOW_MS = 60 * 60 * 1000; // one hour

export async function hitRateLimit(
  key: string,
  limitPerHour: number
): Promise<{ allowed: boolean; remaining: number }> {
  const database = db();
  // Bucket window to the top of the current hour so counts naturally reset.
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

  // Upsert one row per (key, window_start).
  await database
    .insert(schema.rateLimits)
    .values({ key, window_start: windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimits.key, schema.rateLimits.window_start],
      set: { count: sql`${schema.rateLimits.count} + 1` },
    });

  const [row] = await database
    .select()
    .from(schema.rateLimits)
    .where(and(eq(schema.rateLimits.key, key), eq(schema.rateLimits.window_start, windowStart)))
    .limit(1);

  const count = row?.count ?? 1;
  return { allowed: count <= limitPerHour, remaining: Math.max(limitPerHour - count, 0) };
}
