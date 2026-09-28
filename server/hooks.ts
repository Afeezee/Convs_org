// Server-side hooks that keep
// denormalised counters in sync, writing notifications and cascading deletes.
// Every mutation runs inside a single transaction so the hook and the row it
// depends on commit together.
//
// Counter updates use atomic SQL (`col = col + 1`) rather than read-modify-
// write; that way concurrent inserts don't race.

import { and, eq, sql, inArray } from "drizzle-orm";
import type { PoolClient } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getPool, schema, db } from "./db.js";
import type { Session } from "./auth.js";
import { conflict, badRequest, unprocessable } from "./errors.js";
import { moderate } from "./moderation/index.js";

type Tx = ReturnType<typeof drizzle>;

async function withTx<T>(fn: (tx: Tx, client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const tx = drizzle(client, { schema });
    const result = await fn(tx, client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ---------- Comment ----------

export async function onCommentCreate(
  input: typeof schema.comments.$inferInsert
): Promise<typeof schema.comments.$inferSelect & { _warning?: string; _queued?: boolean }> {
  // Moderate first — a block short-circuits before any DB write. Runs outside
  // the txn because it may take up to 8 s and holds no DB locks.
  const mod = await moderate({
    kind: "comment",
    content: input.content,
    stance: input.stance,
    flaw_tag: input.flaw_tag,
    strength_tag: input.strength_tag,
  });
  if (mod.action === "block") {
    throw unprocessable("moderation_blocked", mod.feedback);
  }
  if (mod.action === "warn") {
    throw unprocessable(
      "moderation_warning",
      `${mod.verdict.feedback_message}\n\nPlease revise your comment with more context and evidence before posting.`
    );
  }

  return withTx(async (tx) => {
    const [conv] = await tx
      .select()
      .from(schema.convs)
      .where(eq(schema.convs.id, input.conv_id))
      .limit(1);
    if (!conv) throw badRequest("conv_id does not exist");

    const constructiveness =
      mod.action === "queued"
        ? 0
        : Math.round((mod.verdict.constructiveness_score ?? 0) * 100);
    const status = mod.action === "queued" ? "pending" : "published";

    const [comment] = await tx
      .insert(schema.comments)
      .values({
        ...input,
        constructiveness_score: constructiveness,
        status,
      })
      .returning();

    // Bump conv.comment_count, and stance-specific counts.
    const stance = comment.stance;
    await tx
      .update(schema.convs)
      .set({
        comment_count: sql`${schema.convs.comment_count} + 1`,
        support_count:
          stance === "support"
            ? sql`${schema.convs.support_count} + 1`
            : schema.convs.support_count,
        oppose_count:
          stance === "oppose"
            ? sql`${schema.convs.oppose_count} + 1`
            : schema.convs.oppose_count,
      })
      .where(eq(schema.convs.id, comment.conv_id));

    // Author's profile counters
    if (stance === "support" || stance === "oppose") {
      await tx
        .update(schema.profiles)
        .set({
          [stance === "support" ? "support_count" : "oppose_count"]:
            stance === "support"
              ? sql`${schema.profiles.support_count} + 1`
              : sql`${schema.profiles.oppose_count} + 1`,
        } as never)
        .where(eq(schema.profiles.email, comment.author_email));
    }

    // Notification to conv author (never yourself).
    if (conv.author_email && conv.author_email !== comment.author_email) {
      const type =
        stance === "support" ? "support" : stance === "oppose" ? "oppose" : "comment";
      const message =
        stance === "support"
          ? "supported your conv"
          : stance === "oppose"
          ? "opposed your conv"
          : "commented on your conv";
      await tx.insert(schema.notifications).values({
        user_email: conv.author_email,
        type,
        from_email: comment.author_email,
        from_name: comment.author_name,
        conv_id: comment.conv_id,
        comment_id: comment.id,
        message,
      });
    }

    // If moderation is queued, enqueue with the row id so drain can update status.
    if (mod.action === "queued") {
      await tx.insert(schema.moderationQueue).values({
        kind: "comment",
        entity_id: comment.id,
        content_hash: "",
        payload: {
          kind: "comment",
          content: comment.content,
          stance: comment.stance,
          flaw_tag: comment.flaw_tag,
          strength_tag: comment.strength_tag,
        },
        status: "queued",
        next_retry_at: new Date(Date.now() + 60_000),
      });
    }

    return {
      ...comment,
      _queued: mod.action === "queued",
    } as typeof comment & { _queued?: boolean };
  });
}

export async function onCommentDelete(id: string): Promise<void> {
  return withTx(async (tx) => {
    const [comment] = await tx
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, id))
      .limit(1);
    if (!comment) return;

    await tx
      .update(schema.convs)
      .set({
        comment_count: sql`GREATEST(${schema.convs.comment_count} - 1, 0)`,
        support_count:
          comment.stance === "support"
            ? sql`GREATEST(${schema.convs.support_count} - 1, 0)`
            : schema.convs.support_count,
        oppose_count:
          comment.stance === "oppose"
            ? sql`GREATEST(${schema.convs.oppose_count} - 1, 0)`
            : schema.convs.oppose_count,
      })
      .where(eq(schema.convs.id, comment.conv_id));

    if (comment.stance === "support" || comment.stance === "oppose") {
      await tx
        .update(schema.profiles)
        .set({
          [comment.stance === "support" ? "support_count" : "oppose_count"]:
            comment.stance === "support"
              ? sql`GREATEST(${schema.profiles.support_count} - 1, 0)`
              : sql`GREATEST(${schema.profiles.oppose_count} - 1, 0)`,
        } as never)
        .where(eq(schema.profiles.email, comment.author_email));
    }

    // Delete the ratings tied to this comment, then the comment itself.
    await tx
      .delete(schema.commentRatings)
      .where(eq(schema.commentRatings.comment_id, id));
    await tx.delete(schema.comments).where(eq(schema.comments.id, id));
  });
}

// ---------- Follow ----------

export async function onFollowCreate(
  input: typeof schema.follows.$inferInsert,
  session: Session
): Promise<typeof schema.follows.$inferSelect> {
  const follower = input.follower_email;
  const following = input.following_email.toLowerCase();
  if (follower === following) throw badRequest("Cannot follow yourself");

  return withTx(async (tx) => {
    // Duplicate guard (also enforced by unique index; catch to a nicer error)
    const existing = await tx
      .select({ id: schema.follows.id })
      .from(schema.follows)
      .where(
        and(
          eq(schema.follows.follower_email, follower),
          eq(schema.follows.following_email, following)
        )
      )
      .limit(1);
    if (existing[0]) throw conflict("Already following");

    const [row] = await tx
      .insert(schema.follows)
      .values({ ...input, following_email: following })
      .returning();

    await tx
      .update(schema.profiles)
      .set({ followers_count: sql`${schema.profiles.followers_count} + 1` })
      .where(eq(schema.profiles.email, following));
    await tx
      .update(schema.profiles)
      .set({ following_count: sql`${schema.profiles.following_count} + 1` })
      .where(eq(schema.profiles.email, follower));

    await tx.insert(schema.notifications).values({
      user_email: following,
      type: "follow",
      from_email: follower,
      from_name: session.fullName ?? follower,
      message: "started following you",
    });

    return row;
  });
}

export async function onFollowDelete(id: string): Promise<void> {
  return withTx(async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.follows)
      .where(eq(schema.follows.id, id))
      .limit(1);
    if (!row) return;
    await tx.delete(schema.follows).where(eq(schema.follows.id, id));
    await tx
      .update(schema.profiles)
      .set({
        followers_count: sql`GREATEST(${schema.profiles.followers_count} - 1, 0)`,
      })
      .where(eq(schema.profiles.email, row.following_email));
    await tx
      .update(schema.profiles)
      .set({
        following_count: sql`GREATEST(${schema.profiles.following_count} - 1, 0)`,
      })
      .where(eq(schema.profiles.email, row.follower_email));
  });
}

// ---------- Bookmark ----------

export async function onBookmarkCreate(
  input: typeof schema.bookmarks.$inferInsert
): Promise<typeof schema.bookmarks.$inferSelect> {
  return withTx(async (tx) => {
    const existing = await tx
      .select({ id: schema.bookmarks.id })
      .from(schema.bookmarks)
      .where(
        and(
          eq(schema.bookmarks.user_email, input.user_email),
          eq(schema.bookmarks.conv_id, input.conv_id),
          eq(schema.bookmarks.type, input.type ?? "conv")
        )
      )
      .limit(1);
    if (existing[0]) throw conflict("Already bookmarked");

    const [row] = await tx.insert(schema.bookmarks).values(input).returning();
    if ((input.type ?? "conv") === "conv") {
      await tx
        .update(schema.convs)
        .set({ bookmark_count: sql`${schema.convs.bookmark_count} + 1` })
        .where(eq(schema.convs.id, input.conv_id));
    }
    return row;
  });
}

export async function onBookmarkDelete(id: string): Promise<void> {
  return withTx(async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.bookmarks)
      .where(eq(schema.bookmarks.id, id))
      .limit(1);
    if (!row) return;
    await tx.delete(schema.bookmarks).where(eq(schema.bookmarks.id, id));
    if (row.type === "conv") {
      await tx
        .update(schema.convs)
        .set({
          bookmark_count: sql`GREATEST(${schema.convs.bookmark_count} - 1, 0)`,
        })
        .where(eq(schema.convs.id, row.conv_id));
    }
  });
}

// ---------- Conv ----------

export async function onConvCreate(
  input: typeof schema.convs.$inferInsert
): Promise<typeof schema.convs.$inferSelect & { _warning?: string; _queued?: boolean }> {
  const mod = await moderate({
    kind: "conv",
    content: input.content,
    variant: input.type ?? "short",
  });
  // Convs `block` returns 422; `warn` still publishes (spec keeps existing
  // behaviour) with the feedback attached to the response.
  if (mod.action === "block") {
    throw unprocessable("moderation_blocked", mod.feedback);
  }

  return withTx(async (tx) => {
    const quality =
      mod.action === "queued"
        ? 0
        : Math.round((mod.verdict.quality_score ?? 0) * 100);
    const status = mod.action === "queued" ? "moderated" : (input.status ?? "published");

    const [row] = await tx
      .insert(schema.convs)
      .values({ ...input, quality_score: quality, status })
      .returning();
    await tx
      .update(schema.profiles)
      .set({ convs_count: sql`${schema.profiles.convs_count} + 1` })
      .where(eq(schema.profiles.email, row.author_email));

    if (mod.action === "queued") {
      await tx.insert(schema.moderationQueue).values({
        kind: "conv",
        entity_id: row.id,
        content_hash: "",
        payload: { kind: "conv", content: row.content, variant: row.type },
        status: "queued",
        next_retry_at: new Date(Date.now() + 60_000),
      });
    }

    const enriched = row as typeof row & { _warning?: string; _queued?: boolean };
    if (mod.action === "warn") enriched._warning = mod.verdict.feedback_message;
    if (mod.action === "queued") enriched._queued = true;
    return enriched;
  });
}

export async function onConvDelete(id: string): Promise<void> {
  return withTx(async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.convs)
      .where(eq(schema.convs.id, id))
      .limit(1);
    if (!row) return;
    // Cascade: comments and their ratings, bookmarks, reconvs, reports.
    const commentIds = (
      await tx
        .select({ id: schema.comments.id })
        .from(schema.comments)
        .where(eq(schema.comments.conv_id, id))
    ).map((r) => r.id);
    if (commentIds.length) {
      await tx
        .delete(schema.commentRatings)
        .where(inArray(schema.commentRatings.comment_id, commentIds));
      await tx.delete(schema.comments).where(eq(schema.comments.conv_id, id));
    }
    await tx.delete(schema.bookmarks).where(eq(schema.bookmarks.conv_id, id));
    await tx.delete(schema.reconvs).where(eq(schema.reconvs.original_conv_id, id));
    await tx.delete(schema.reports).where(eq(schema.reports.conv_id, id));
    await tx.delete(schema.convs).where(eq(schema.convs.id, id));

    await tx
      .update(schema.profiles)
      .set({ convs_count: sql`GREATEST(${schema.profiles.convs_count} - 1, 0)` })
      .where(eq(schema.profiles.email, row.author_email));
  });
}

// ---------- Reconv ----------

export async function onReconvCreate(
  input: typeof schema.reconvs.$inferInsert
): Promise<typeof schema.reconvs.$inferSelect> {
  return withTx(async (tx) => {
    const existing = await tx
      .select({ id: schema.reconvs.id })
      .from(schema.reconvs)
      .where(
        and(
          eq(schema.reconvs.user_email, input.user_email),
          eq(schema.reconvs.original_conv_id, input.original_conv_id)
        )
      )
      .limit(1);
    if (existing[0]) throw conflict("Already reconved");
    const [row] = await tx.insert(schema.reconvs).values(input).returning();
    return row;
  });
}

// ---------- Message ----------

export async function onMessageCreate(
  input: typeof schema.messages.$inferInsert
): Promise<typeof schema.messages.$inferSelect> {
  const sender = input.sender_email;
  const receiver = input.receiver_email.toLowerCase();

  // Mutual-follow check derives the message status server-side. We run it
  // outside the txn because moderation may be slow.
  const database = db();
  const mutualA = await database
    .select({ id: schema.follows.id })
    .from(schema.follows)
    .where(
      and(
        eq(schema.follows.follower_email, receiver),
        eq(schema.follows.following_email, sender)
      )
    )
    .limit(1);
  const mutualB = await database
    .select({ id: schema.follows.id })
    .from(schema.follows)
    .where(
      and(
        eq(schema.follows.follower_email, sender),
        eq(schema.follows.following_email, receiver)
      )
    )
    .limit(1);
  const isMutual = !!mutualA[0] && !!mutualB[0];

  // Is this the first message in the thread? Then always model-check.
  const [priorAny] = await database
    .select({ id: schema.messages.id })
    .from(schema.messages)
    .where(eq(schema.messages.conversation_id, input.conversation_id))
    .limit(1);
  const firstMessage = !priorAny;

  const mod = await moderate({
    kind: "message",
    content: input.content,
    skipModelWhenClean: isMutual, // between mutuals, only model-check on flag
    firstMessage,
  });
  if (mod.action === "block") {
    throw unprocessable("moderation_blocked", mod.feedback);
  }

  const status: "sent" | "pending" = isMutual ? "sent" : "pending";
  return withTx(async (tx) => {
    const [row] = await tx
      .insert(schema.messages)
      .values({ ...input, receiver_email: receiver, status })
      .returning();
    return row;
  });
}

// ---------- Account delete (cascade) ----------

export async function onUserDelete(userId: string): Promise<{ email: string }> {
  return withTx(async (tx) => {
    const [u] = await tx
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!u) throw badRequest("User not found");
    const email = u.email;

    // Convs (and their cascade) — go one by one so cascade counters run.
    const ownedConvs = (
      await tx
        .select({ id: schema.convs.id })
        .from(schema.convs)
        .where(eq(schema.convs.author_email, email))
    ).map((r) => r.id);
    for (const cid of ownedConvs) {
      // Inline cascade (avoid re-entering the withTx wrapper).
      const commentIds = (
        await tx
          .select({ id: schema.comments.id })
          .from(schema.comments)
          .where(eq(schema.comments.conv_id, cid))
      ).map((r) => r.id);
      if (commentIds.length) {
        await tx
          .delete(schema.commentRatings)
          .where(inArray(schema.commentRatings.comment_id, commentIds));
        await tx.delete(schema.comments).where(eq(schema.comments.conv_id, cid));
      }
      await tx.delete(schema.bookmarks).where(eq(schema.bookmarks.conv_id, cid));
      await tx
        .delete(schema.reconvs)
        .where(eq(schema.reconvs.original_conv_id, cid));
      await tx.delete(schema.reports).where(eq(schema.reports.conv_id, cid));
      await tx.delete(schema.convs).where(eq(schema.convs.id, cid));
    }

    await tx.delete(schema.comments).where(eq(schema.comments.author_email, email));
    await tx.delete(schema.follows).where(eq(schema.follows.follower_email, email));
    await tx.delete(schema.follows).where(eq(schema.follows.following_email, email));
    await tx.delete(schema.bookmarks).where(eq(schema.bookmarks.user_email, email));
    await tx.delete(schema.reconvs).where(eq(schema.reconvs.user_email, email));
    await tx
      .delete(schema.commentRatings)
      .where(eq(schema.commentRatings.user_email, email));
    await tx.delete(schema.messages).where(eq(schema.messages.sender_email, email));
    await tx
      .delete(schema.messages)
      .where(eq(schema.messages.receiver_email, email));
    await tx
      .delete(schema.notifications)
      .where(eq(schema.notifications.user_email, email));
    await tx.delete(schema.profiles).where(eq(schema.profiles.email, email));
    await tx.delete(schema.users).where(eq(schema.users.id, userId));

    return { email };
  });
}
