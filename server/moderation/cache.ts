// Content-hash cache. Key = SHA-256(kind + normalisedContent + tags).
// Repeated identical text (bot spam, duplicated posts) is answered from cache
// without spending model tokens. TTL is enforced on read (7 days).

import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../db";
import type { Verdict, Action } from "./decide";

const TTL_DAYS = 7;

export function contentHash(
  kind: "conv" | "comment" | "message",
  content: string,
  flawTag?: string | null,
  strengthTag?: string | null
): string {
  const normalised = content.trim().replace(/\s+/g, " ").toLowerCase();
  const tags = `${flawTag ?? ""}|${strengthTag ?? ""}`;
  return createHash("sha256").update(`${kind}|${normalised}|${tags}`).digest("hex");
}

export async function cacheLookup(
  hash: string
): Promise<{ verdict: Verdict; action: Action; model: string } | null> {
  const database = db();
  const [row] = await database
    .select()
    .from(schema.moderationCache)
    .where(eq(schema.moderationCache.content_hash, hash))
    .limit(1);
  if (!row) return null;
  const ageDays = (Date.now() - row.created_date.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > TTL_DAYS) return null;
  return {
    verdict: row.verdict as Verdict,
    action: row.action,
    model: row.model,
  };
}

export async function cacheWrite(
  hash: string,
  verdict: Verdict,
  action: Action,
  model: string
): Promise<void> {
  const database = db();
  // Upsert on the content_hash primary key.
  await database
    .insert(schema.moderationCache)
    .values({ content_hash: hash, verdict, action, model })
    .onConflictDoUpdate({
      target: schema.moderationCache.content_hash,
      set: { verdict, action, model, created_date: sql`now()` },
    });
}
