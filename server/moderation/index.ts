// Moderation orchestrator: called from the Conv/Comment/Message create paths
// and from the queue-drain cron. Runs prefilter → cache → budget-reserve →
// Groq → normalise → decide. Any failure lands in the retry queue so no
// content is lost and nothing unmoderated is ever published.

import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";
import { prefilter } from "./prefilter";
import { cacheLookup, cacheWrite, contentHash } from "./cache";
import { reserve, commitUsage, refund } from "./ledger";
import { callGroq } from "./provider";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { normaliseVerdict, decide, type Verdict, type Action } from "./decide";
import { env } from "../env";

export interface ModerateArgs {
  kind: "conv" | "comment" | "message";
  entity_id?: string;
  content: string;
  variant?: "short" | "long" | "media";
  stance?: "support" | "oppose" | "clarification" | null;
  flaw_tag?: string | null;
  strength_tag?: string | null;
  /**
   * If true (messages), only call the model when the prefilter flags OR the
   * caller passes `firstMessage=true`. Otherwise pass everything to the model.
   */
  skipModelWhenClean?: boolean;
  firstMessage?: boolean;
}

export type ModerateResult =
  | { action: "approve"; verdict: Verdict; queued: false }
  | { action: "warn"; verdict: Verdict; queued: false }
  | { action: "block"; verdict: Verdict | null; queued: false; feedback: string }
  | { action: "queued"; verdict: null; queued: true };

// Rough token estimate for prompt + completion cap. Actual is reconciled from
// response usage; we keep the estimate conservative so ceilings hit early.
const EST_TOKENS = 800;

export async function moderate(args: ModerateArgs): Promise<ModerateResult> {
  const hash = contentHash(args.kind, args.content, args.flaw_tag, args.strength_tag);

  // 1. Prefilter — cheap, deterministic, no model call.
  const pf = prefilter(args.kind, args.content, args.variant);
  if (pf.kind === "block") {
    await logEvent(args, hash, "block", null, "prefilter");
    return {
      action: "block",
      verdict: null,
      queued: false,
      feedback: pf.feedback,
    };
  }

  // 2. Skip-when-clean shortcut (Messages between mutuals with no prefilter flag).
  if (args.skipModelWhenClean && pf.kind === "pass" && !args.firstMessage) {
    return {
      action: "approve",
      verdict: emptyApprovedVerdict(),
      queued: false,
    };
  }

  // 3. Cache lookup.
  const cached = await cacheLookup(hash);
  if (cached) {
    await logEvent(args, hash, cached.action, cached.verdict, cached.model);
    return unpackCached(cached.action, cached.verdict);
  }

  // 4. Budget reservation.
  const budget = await reserve(EST_TOKENS);
  if (!budget.ok) return queueAndReturn(args, hash, `budget:${budget.reason}`);

  // 5. Groq call, with one repair-retry if parsing fails.
  try {
    const response = await callGroq({
      system: SYSTEM_PROMPT,
      user: buildUserMessage({
        kind: args.kind,
        content: args.content,
        stance: args.stance,
        flaw_tag: args.flaw_tag,
        strength_tag: args.strength_tag,
      }),
      tryJsonMode: true,
    });
    await commitUsage(
      EST_TOKENS,
      response.usage.prompt_tokens,
      response.usage.completion_tokens
    );

    let verdict: Verdict;
    try {
      verdict = normaliseVerdict(response.parsed);
    } catch {
      // Repair retry — same prompt, without JSON mode (some models emit
      // structured output only with a plain prompt).
      const retry = await callGroq({
        system: SYSTEM_PROMPT,
        user: buildUserMessage({
          kind: args.kind,
          content: args.content,
          stance: args.stance,
          flaw_tag: args.flaw_tag,
          strength_tag: args.strength_tag,
        }),
        tryJsonMode: false,
      });
      await commitUsage(
        0,
        retry.usage.prompt_tokens,
        retry.usage.completion_tokens
      );
      verdict = normaliseVerdict(retry.parsed);
    }

    const action = decide(verdict);
    await cacheWrite(hash, verdict, action, response.model);
    await logEvent(args, hash, action, verdict, response.model, response.usage);

    if (action === "block") {
      return {
        action: "block",
        verdict,
        queued: false,
        feedback: verdict.feedback_message,
      };
    }
    if (action === "warn") return { action: "warn", verdict, queued: false };
    return { action: "approve", verdict, queued: false };
  } catch (err) {
    // Refund the reservation on failure and queue.
    await refund(EST_TOKENS).catch(() => {});
    const reason = err instanceof Error ? err.message : "unknown";
    return queueAndReturn(args, hash, `provider:${reason.slice(0, 200)}`);
  }
}

async function queueAndReturn(
  args: ModerateArgs,
  hash: string,
  reason: string
): Promise<ModerateResult> {
  const database = db();
  await database.insert(schema.moderationQueue).values({
    kind: args.kind,
    entity_id: args.entity_id ?? "00000000-0000-0000-0000-000000000000",
    content_hash: hash,
    payload: {
      kind: args.kind,
      content: args.content,
      stance: args.stance ?? null,
      flaw_tag: args.flaw_tag ?? null,
      strength_tag: args.strength_tag ?? null,
      variant: args.variant ?? null,
    },
    attempts: 0,
    last_error: reason,
    status: "queued",
    next_retry_at: new Date(Date.now() + 60_000),
  });
  return { action: "queued", verdict: null, queued: true };
}

async function logEvent(
  args: ModerateArgs,
  hash: string,
  action: Action | "block",
  verdict: Verdict | null,
  model: string,
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
): Promise<void> {
  // Never log the raw text of a private message.
  const database = db();
  await database.insert(schema.moderationEvents).values({
    kind: args.kind,
    entity_id: args.entity_id ?? null,
    content_hash: hash,
    verdict: verdict ?? null,
    action: action as Action,
    model,
    prompt_tokens: usage?.prompt_tokens ?? 0,
    completion_tokens: usage?.completion_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? 0,
  });
}

function emptyApprovedVerdict(): Verdict {
  return {
    toxicity_score: 0,
    personal_attack: false,
    promotes_violence_or_self_harm: false,
    manipulative: false,
    constructiveness_score: 1,
    quality_score: 0,
    tag_match_score: 1,
    suggested_tag: null,
    feedback_message: "",
  };
}

function unpackCached(action: Action, verdict: Verdict): ModerateResult {
  if (action === "block") {
    return {
      action: "block",
      verdict,
      queued: false,
      feedback: verdict.feedback_message,
    };
  }
  if (action === "warn") return { action: "warn", verdict, queued: false };
  return { action: "approve", verdict, queued: false };
}

// ------------------------------------------------------------------------
// Cron: drain the retry queue in small batches within budget.
// ------------------------------------------------------------------------

export async function drainModerationQueue(
  batchSize = 20
): Promise<{ drained: number; approved: number; warned: number; blocked: number; requeued: number }> {
  const database = db();
  const now = new Date();
  const rows = await database
    .select()
    .from(schema.moderationQueue)
    .where(
      sql`${schema.moderationQueue.status} = 'queued' AND (${schema.moderationQueue.next_retry_at} IS NULL OR ${schema.moderationQueue.next_retry_at} <= ${now})`
    )
    .limit(batchSize);

  const counts = { drained: 0, approved: 0, warned: 0, blocked: 0, requeued: 0 };
  for (const row of rows) {
    const payload = row.payload as {
      kind: "conv" | "comment" | "message";
      content: string;
      stance?: "support" | "oppose" | "clarification" | null;
      flaw_tag?: string | null;
      strength_tag?: string | null;
      variant?: "short" | "long" | "media" | null;
    };
    await database
      .update(schema.moderationQueue)
      .set({ status: "retrying", attempts: sql`${schema.moderationQueue.attempts} + 1` })
      .where(eq(schema.moderationQueue.id, row.id));

    const result = await moderate({
      kind: payload.kind,
      entity_id: row.entity_id,
      content: payload.content,
      variant: payload.variant ?? undefined,
      stance: payload.stance ?? null,
      flaw_tag: payload.flaw_tag ?? null,
      strength_tag: payload.strength_tag ?? null,
    });

    counts.drained++;
    if (result.action === "queued") {
      counts.requeued++;
      const attempts = (row.attempts ?? 0) + 1;
      const backoffSec = Math.min(60 * 2 ** attempts, 3600);
      await database
        .update(schema.moderationQueue)
        .set({
          status: "queued",
          next_retry_at: new Date(Date.now() + backoffSec * 1000),
        })
        .where(eq(schema.moderationQueue.id, row.id));
      continue;
    }

    // Publish (or hide) the entity based on the verdict.
    if (row.entity_id && payload.kind === "conv") {
      await database
        .update(schema.convs)
        .set({
          status:
            result.action === "block"
              ? "moderated"
              : result.action === "warn"
              ? "published"
              : "published",
          quality_score:
            result.action !== "block" && result.verdict
              ? Math.round((result.verdict.quality_score ?? 0) * 100)
              : 0,
          updated_date: new Date(),
        })
        .where(eq(schema.convs.id, row.entity_id));
    } else if (row.entity_id && payload.kind === "comment") {
      await database
        .update(schema.comments)
        .set({
          status: result.action === "block" ? "moderated" : "published",
          constructiveness_score:
            result.action !== "block" && result.verdict
              ? Math.round((result.verdict.constructiveness_score ?? 0) * 100)
              : 0,
          updated_date: new Date(),
        })
        .where(eq(schema.comments.id, row.entity_id));
    } else if (row.entity_id && payload.kind === "message") {
      // Messages have no moderated status; a blocked message row is simply
      // deleted on drain — safer than leaving invisible pending forever.
      if (result.action === "block") {
        await database
          .delete(schema.messages)
          .where(eq(schema.messages.id, row.entity_id));
      }
    }

    await database
      .update(schema.moderationQueue)
      .set({ status: "done" })
      .where(eq(schema.moderationQueue.id, row.id));

    if (result.action === "approve") counts.approved++;
    else if (result.action === "warn") counts.warned++;
    else counts.blocked++;
  }

  return counts;
}

// Re-exports so callers can import from one place.
export { contentHash } from "./cache";
export { env };
