// Per-minute (RPM, TPM) and per-day (TPD) budget ledger, backed by the
// `llm_usage` table so all serverless instances share one counter. Every call
// path reserves a slot before making the request and then commits the actual
// token usage from the response.
//
// The soft ceilings come from GROQ_RPM_CEILING / TPM_CEILING / TPD_CEILING;
// they sit below the plan's true limits so we degrade to the retry queue
// before Groq starts returning 429.

import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../env";

export type BudgetOutcome = { ok: true } | { ok: false; reason: string };

function minuteKey(prefix: string, at: Date = new Date()): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, "0");
  const d = String(at.getUTCDate()).padStart(2, "0");
  const h = String(at.getUTCHours()).padStart(2, "0");
  const min = String(at.getUTCMinutes()).padStart(2, "0");
  return `${prefix}:${y}${m}${d}${h}${min}`;
}
function dayKey(prefix: string, at: Date = new Date()): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, "0");
  const d = String(at.getUTCDate()).padStart(2, "0");
  return `${prefix}:${y}${m}${d}`;
}

async function currentCount(key: string): Promise<number> {
  const database = db();
  const [row] = await database
    .select()
    .from(schema.llmUsage)
    .where(eq(schema.llmUsage.bucket_key, key))
    .limit(1);
  return row?.count ?? 0;
}

async function increment(key: string, delta: number): Promise<void> {
  const database = db();
  await database
    .insert(schema.llmUsage)
    .values({ bucket_key: key, count: delta })
    .onConflictDoUpdate({
      target: schema.llmUsage.bucket_key,
      set: {
        count: sql`${schema.llmUsage.count} + ${delta}`,
        updated_date: sql`now()`,
      },
    });
}

/**
 * Reserve budget for one call. Reject fast when a ceiling is already reached.
 * The caller commits the actual token usage with `commitUsage` after the
 * response lands so TPM/TPD stay accurate.
 */
export async function reserve(estimatedTokens: number): Promise<BudgetOutcome> {
  const e = env();
  const rpmKey = minuteKey("rpm");
  const tpmKey = minuteKey("tpm");
  const tpdKey = dayKey("tpd");
  const [rpm, tpm, tpd] = await Promise.all([
    currentCount(rpmKey),
    currentCount(tpmKey),
    currentCount(tpdKey),
  ]);
  if (rpm + 1 > e.GROQ_RPM_CEILING) return { ok: false, reason: "rpm_ceiling" };
  if (tpm + estimatedTokens > e.GROQ_TPM_CEILING)
    return { ok: false, reason: "tpm_ceiling" };
  if (tpd + estimatedTokens > e.GROQ_TPD_CEILING)
    return { ok: false, reason: "tpd_ceiling" };
  // Reserve one request slot immediately (so concurrent callers see the
  // increment); tokens are reserved as the *estimate* and reconciled with the
  // real usage in commitUsage.
  await increment(rpmKey, 1);
  await increment(tpmKey, estimatedTokens);
  await increment(tpdKey, estimatedTokens);
  return { ok: true };
}

/**
 * Reconcile the reserved estimate with the response's actual usage. If the
 * response used *fewer* tokens than reserved we refund the difference.
 */
export async function commitUsage(
  estimated: number,
  actualPrompt: number,
  actualCompletion: number
): Promise<void> {
  const actual = actualPrompt + actualCompletion;
  const delta = actual - estimated;
  if (delta === 0) return;
  const tpmKey = minuteKey("tpm");
  const tpdKey = dayKey("tpd");
  await increment(tpmKey, delta);
  await increment(tpdKey, delta);
}

/** Release a reservation when the request fails without spending tokens. */
export async function refund(estimated: number): Promise<void> {
  const rpmKey = minuteKey("rpm");
  const tpmKey = minuteKey("tpm");
  const tpdKey = dayKey("tpd");
  await increment(rpmKey, -1);
  await increment(tpmKey, -estimated);
  await increment(tpdKey, -estimated);
}

// Exported for tests
export const _keys = { minuteKey, dayKey };
