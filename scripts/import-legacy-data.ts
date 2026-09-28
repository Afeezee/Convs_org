// Idempotent import from a legacy JSON export. Reads `migration-data/*.json`
// (gitignored — you supply the dumps), lower-cases every email, normalises
// topics, casts float counters back to integers, recomputes every denorm
// counter from the actual rows and writes any divergence to
// `migration-report.json`. `--dry-run` reports what would happen without
// touching the database.
//
// The `legacy_id` column on every table is used to make re-runs safe: a row
// with a matching `legacy_id` is updated in place, never duplicated.

import { readFile, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { resolve, join } from "node:path";
import { getPool, schema } from "../server/db";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, sql } from "drizzle-orm";

interface Options {
  dryRun: boolean;
  includeSamples: boolean;
  dir: string;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    includeSamples: args.includes("--include-samples"),
    dir: args.find((a) => a.startsWith("--dir="))?.slice("--dir=".length) ??
      "migration-data",
  };
}

const opt = parseArgs();
const DIR = resolve(opt.dir);

async function readJson<T>(name: string): Promise<T[]> {
  const path = join(DIR, name);
  try {
    await access(path, fsConstants.R_OK);
  } catch {
    return [];
  }
  const raw = await readFile(path, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : Array.isArray(parsed.records) ? parsed.records : [];
  } catch (err) {
    throw new Error(`Failed to parse ${name}: ${err instanceof Error ? err.message : err}`);
  }
}

function lower(x: unknown): string | null {
  if (typeof x !== "string" || !x) return null;
  return x.trim().toLowerCase();
}
function nonEmpty<T>(x: T | null | undefined): x is T {
  return x !== null && x !== undefined;
}
function toInt(x: unknown): number {
  if (typeof x === "number") return Math.round(x);
  if (typeof x === "string" && x.trim() && !Number.isNaN(Number(x))) return Math.round(Number(x));
  return 0;
}
function toDate(x: unknown): Date | null {
  if (!x) return null;
  const d = new Date(x as string);
  return Number.isNaN(d.getTime()) ? null : d;
}
function normaliseTopics(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    // Explode "AfricanHistory #Genderroles #Culturalnarratives" into pieces.
    const pieces = item
      .split(/[\s,]+/)
      .map((p) => p.replace(/^#+/, "").trim())
      .filter(Boolean);
    for (const p of pieces) out.add(p);
  }
  return [...out];
}
function isSample(row: Record<string, unknown>): boolean {
  if (row.is_sample === true) return true;
  const email = String(row.email ?? row.author_email ?? row.user_email ?? "");
  if (email.endsWith("@convs.io")) return true;
  return false;
}

interface DiffRow {
  entity: string;
  key: string;
  field: string;
  stored: number;
  actual: number;
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(
    `[import] dir=${DIR} dry=${opt.dryRun} include_samples=${opt.includeSamples}`
  );
  const pool = getPool();
  const db = drizzle(pool, { schema });

  const [users, profiles, convs, comments, ratings, reconvs, bookmarks, follows, messages, notifications, reports] =
    await Promise.all([
      readJson<Record<string, unknown>>("User.json"),
      readJson<Record<string, unknown>>("Profile.json"),
      readJson<Record<string, unknown>>("Conv.json"),
      readJson<Record<string, unknown>>("Comment.json"),
      readJson<Record<string, unknown>>("CommentRating.json"),
      readJson<Record<string, unknown>>("Reconv.json"),
      readJson<Record<string, unknown>>("Bookmark.json"),
      readJson<Record<string, unknown>>("Follow.json"),
      readJson<Record<string, unknown>>("Message.json"),
      readJson<Record<string, unknown>>("Notification.json"),
      readJson<Record<string, unknown>>("Report.json"),
    ]);

  const emailToLegacyUserId = new Map<string, string>();
  const legacyConvIdToNewId = new Map<string, string>();
  const legacyCommentIdToNewId = new Map<string, string>();
  const skipped = { users: 0, profiles: 0, convs: 0, comments: 0, ratings: 0, reconvs: 0, bookmarks: 0, follows: 0, messages: 0, notifications: 0, reports: 0 };

  // -- Users --
  for (const raw of users) {
    if (!opt.includeSamples && isSample(raw)) {
      skipped.users++;
      continue;
    }
    const email = lower(raw.email ?? raw.full_name);
    if (!email) continue;
    const legacy_id = String(raw.id ?? "");
    emailToLegacyUserId.set(email, legacy_id);
    if (opt.dryRun) continue;

    const row = {
      legacy_id: legacy_id || null,
      email,
      email_verified: false,
      full_name: (raw.full_name as string) ?? null,
      role: ((raw.role as string) ?? "user") as "user" | "moderator" | "admin" | "verified_expert",
      theme: ((raw.theme as string) ?? "light") as "light" | "dark",
      username: (raw.username as string) ?? null,
      bio: (raw.bio as string) ?? null,
      profile_image: (raw.profile_image as string) ?? null,
      cover_image: (raw.cover_image as string) ?? null,
      badges: Array.isArray(raw.badges) ? (raw.badges as string[]) : [],
      created_date: toDate(raw.created_date) ?? undefined,
      updated_date: toDate(raw.updated_date) ?? undefined,
      created_by: (raw.created_by as string) ?? email,
      is_sample: isSample(raw),
    };
    await db
      .insert(schema.users)
      .values(row as never)
      .onConflictDoUpdate({
        target: schema.users.email,
        set: {
          full_name: row.full_name,
          role: row.role,
          username: row.username,
          bio: row.bio,
          profile_image: row.profile_image,
          cover_image: row.cover_image,
          badges: row.badges,
          updated_date: new Date(),
        },
      });
  }

  // -- Profiles --
  for (const raw of profiles) {
    if (!opt.includeSamples && isSample(raw)) { skipped.profiles++; continue; }
    const email = lower(raw.email);
    if (!email) continue;
    if (opt.dryRun) continue;
    const row = {
      legacy_id: String(raw.id ?? "") || null,
      email,
      full_name: (raw.full_name as string) ?? email,
      username: (raw.username as string) ?? null,
      bio: (raw.bio as string) ?? null,
      profile_image: (raw.profile_image as string) ?? null,
      cover_image: (raw.cover_image as string) ?? null,
      followers_count: toInt(raw.followers_count),
      following_count: toInt(raw.following_count),
      convs_count: toInt(raw.convs_count),
      support_count: toInt(raw.support_count),
      oppose_count: toInt(raw.oppose_count),
      avg_quality_score: toInt(raw.avg_quality_score),
      badges: Array.isArray(raw.badges) ? (raw.badges as string[]) : [],
      created_date: toDate(raw.created_date) ?? undefined,
      updated_date: toDate(raw.updated_date) ?? undefined,
      created_by: (raw.created_by as string) ?? email,
      is_sample: isSample(raw),
    };
    await db
      .insert(schema.profiles)
      .values(row as never)
      .onConflictDoUpdate({
        target: schema.profiles.email,
        set: {
          full_name: row.full_name,
          username: row.username,
          bio: row.bio,
          profile_image: row.profile_image,
          cover_image: row.cover_image,
          updated_date: new Date(),
        },
      });
  }

  // -- Convs --
  for (const raw of convs) {
    if (!opt.includeSamples && isSample(raw)) { skipped.convs++; continue; }
    const legacyId = String(raw.id ?? "");
    if (!legacyId) continue;
    const email = lower(raw.author_email);
    if (!email) continue;
    if (opt.dryRun) {
      legacyConvIdToNewId.set(legacyId, `dry-${legacyId}`);
      continue;
    }
    const row = {
      legacy_id: legacyId,
      author_email: email,
      author_name: (raw.author_name as string) ?? email,
      type: ((raw.type as string) ?? "short") as "short" | "long" | "media",
      title: (raw.title as string) ?? null,
      content: (raw.content as string) ?? "",
      rich_content: (raw.rich_content as string) ?? null,
      media_url: (raw.media_url as string) ?? null,
      media_type: ((raw.media_type as string) ?? "none") as "image" | "video" | "none",
      topics: normaliseTopics(raw.topics),
      support_count: toInt(raw.support_count),
      oppose_count: toInt(raw.oppose_count),
      comment_count: toInt(raw.comment_count),
      bookmark_count: toInt(raw.bookmark_count),
      quality_score: toInt(raw.quality_score),
      top_flaws: Array.isArray(raw.top_flaws) ? (raw.top_flaws as string[]) : [],
      top_strengths: Array.isArray(raw.top_strengths) ? (raw.top_strengths as string[]) : [],
      status: ((raw.status as string) ?? "published") as "published" | "moderated" | "draft",
      created_date: toDate(raw.created_date) ?? undefined,
      updated_date: toDate(raw.updated_date) ?? undefined,
      created_by: (raw.created_by as string) ?? email,
      is_sample: isSample(raw),
    };
    const [inserted] = await db
      .insert(schema.convs)
      .values(row as never)
      .onConflictDoUpdate({
        target: schema.convs.legacy_id,
        set: { updated_date: new Date() },
      })
      .returning({ id: schema.convs.id });
    legacyConvIdToNewId.set(legacyId, inserted.id);
  }

  // -- Comments --
  for (const raw of comments) {
    if (!opt.includeSamples && isSample(raw)) { skipped.comments++; continue; }
    const legacyId = String(raw.id ?? "");
    const legacyConvId = String(raw.conv_id ?? "");
    const newConvId = legacyConvIdToNewId.get(legacyConvId);
    if (!newConvId) continue;
    const email = lower(raw.author_email);
    if (!email) continue;
    if (opt.dryRun) {
      legacyCommentIdToNewId.set(legacyId, `dry-${legacyId}`);
      continue;
    }
    const legacyParent = String(raw.parent_comment_id ?? "");
    const parent_comment_id = legacyParent ? legacyCommentIdToNewId.get(legacyParent) ?? null : null;
    const row = {
      legacy_id: legacyId,
      conv_id: newConvId,
      parent_comment_id,
      author_email: email,
      author_name: (raw.author_name as string) ?? email,
      stance: (raw.stance as string) as "support" | "oppose" | "clarification",
      content: (raw.content as string) ?? "",
      highlighted_text: (raw.highlighted_text as string) ?? null,
      flaw_tag: (raw.flaw_tag as string) ?? null,
      strength_tag: (raw.strength_tag as string) ?? null,
      evidence_url: (raw.evidence_url as string) ?? null,
      citation: (raw.citation as string) ?? null,
      constructiveness_score: toInt(raw.constructiveness_score),
      status: ((raw.status as string) ?? "published") as "published" | "moderated" | "pending",
      created_date: toDate(raw.created_date) ?? undefined,
      updated_date: toDate(raw.updated_date) ?? undefined,
      created_by: (raw.created_by as string) ?? email,
      is_sample: isSample(raw),
    };
    if (!row.stance) continue;
    const [inserted] = await db
      .insert(schema.comments)
      .values(row as never)
      .onConflictDoUpdate({
        target: schema.comments.legacy_id,
        set: { updated_date: new Date() },
      })
      .returning({ id: schema.comments.id });
    legacyCommentIdToNewId.set(legacyId, inserted.id);
  }

  // -- CommentRatings --
  for (const raw of ratings) {
    if (!opt.includeSamples && isSample(raw)) { skipped.ratings++; continue; }
    const newCommentId = legacyCommentIdToNewId.get(String(raw.comment_id ?? ""));
    const email = lower(raw.user_email);
    if (!newCommentId || !email) continue;
    if (opt.dryRun) continue;
    await db
      .insert(schema.commentRatings)
      .values({
        legacy_id: String(raw.id ?? "") || null,
        comment_id: newCommentId,
        user_email: email,
        rating: toInt(raw.rating),
        created_date: toDate(raw.created_date) ?? undefined,
        created_by: email,
        is_sample: isSample(raw),
      } as never)
      .onConflictDoNothing();
  }

  // -- Reconvs --
  for (const raw of reconvs) {
    if (!opt.includeSamples && isSample(raw)) { skipped.reconvs++; continue; }
    const newConvId = legacyConvIdToNewId.get(String(raw.original_conv_id ?? ""));
    const email = lower(raw.user_email);
    if (!newConvId || !email) continue;
    if (opt.dryRun) continue;
    await db
      .insert(schema.reconvs)
      .values({
        legacy_id: String(raw.id ?? "") || null,
        user_email: email,
        user_name: (raw.user_name as string) ?? email,
        original_conv_id: newConvId,
        original_author_email: lower(raw.original_author_email) ?? email,
        original_author_name: (raw.original_author_name as string) ?? "",
        thought: (raw.thought as string) ?? null,
        created_date: toDate(raw.created_date) ?? undefined,
        created_by: email,
        is_sample: isSample(raw),
      } as never)
      .onConflictDoNothing();
  }

  // -- Bookmarks --
  for (const raw of bookmarks) {
    if (!opt.includeSamples && isSample(raw)) { skipped.bookmarks++; continue; }
    const newConvId = legacyConvIdToNewId.get(String(raw.conv_id ?? ""));
    const email = lower(raw.user_email);
    if (!newConvId || !email) continue;
    if (opt.dryRun) continue;
    await db
      .insert(schema.bookmarks)
      .values({
        legacy_id: String(raw.id ?? "") || null,
        user_email: email,
        conv_id: newConvId,
        type: ((raw.type as string) ?? "conv") as "conv" | "comment" | "highlight",
        comment_id: legacyCommentIdToNewId.get(String(raw.comment_id ?? "")) ?? null,
        note: (raw.note as string) ?? null,
        created_date: toDate(raw.created_date) ?? undefined,
        created_by: email,
        is_sample: isSample(raw),
      } as never)
      .onConflictDoNothing();
  }

  // -- Follows --
  for (const raw of follows) {
    if (!opt.includeSamples && isSample(raw)) { skipped.follows++; continue; }
    const follower = lower(raw.follower_email);
    const following = lower(raw.following_email);
    if (!follower || !following || follower === following) continue;
    if (opt.dryRun) continue;
    await db
      .insert(schema.follows)
      .values({
        legacy_id: String(raw.id ?? "") || null,
        follower_email: follower,
        following_email: following,
        created_date: toDate(raw.created_date) ?? undefined,
        created_by: follower,
        is_sample: isSample(raw),
      } as never)
      .onConflictDoNothing();
  }

  // -- Messages --
  for (const raw of messages) {
    if (!opt.includeSamples && isSample(raw)) { skipped.messages++; continue; }
    const sender = lower(raw.sender_email);
    const receiver = lower(raw.receiver_email);
    if (!sender || !receiver) continue;
    if (opt.dryRun) continue;
    await db
      .insert(schema.messages)
      .values({
        legacy_id: String(raw.id ?? "") || null,
        conversation_id: (raw.conversation_id as string) ?? [sender, receiver].sort().join("_"),
        sender_email: sender,
        sender_name: (raw.sender_name as string) ?? null,
        receiver_email: receiver,
        receiver_name: (raw.receiver_name as string) ?? null,
        content: (raw.content as string) ?? "",
        media_url: (raw.media_url as string) ?? null,
        is_read: Boolean(raw.is_read),
        is_debate_invite: Boolean(raw.is_debate_invite),
        invited_conv_id: legacyConvIdToNewId.get(String(raw.invited_conv_id ?? "")) ?? null,
        status: ((raw.status as string) ?? "sent") as "sent" | "pending" | "blocked",
        created_date: toDate(raw.created_date) ?? undefined,
        created_by: sender,
        is_sample: isSample(raw),
      } as never)
      .onConflictDoNothing();
  }

  // -- Notifications --
  for (const raw of notifications) {
    if (!opt.includeSamples && isSample(raw)) { skipped.notifications++; continue; }
    const user_email = lower(raw.user_email);
    if (!user_email) continue;
    if (opt.dryRun) continue;
    await db
      .insert(schema.notifications)
      .values({
        legacy_id: String(raw.id ?? "") || null,
        user_email,
        type: raw.type as "follow" | "comment" | "support" | "oppose" | "mention" | "flaw_tag" | "highlight_reply",
        from_email: lower(raw.from_email),
        from_name: (raw.from_name as string) ?? null,
        conv_id: legacyConvIdToNewId.get(String(raw.conv_id ?? "")) ?? null,
        comment_id: legacyCommentIdToNewId.get(String(raw.comment_id ?? "")) ?? null,
        message: (raw.message as string) ?? "",
        is_read: Boolean(raw.is_read),
        created_date: toDate(raw.created_date) ?? undefined,
        created_by: user_email,
        is_sample: isSample(raw),
      } as never)
      .onConflictDoNothing();
  }

  // -- Reports --
  for (const raw of reports) {
    if (!opt.includeSamples && isSample(raw)) { skipped.reports++; continue; }
    const newConvId = legacyConvIdToNewId.get(String(raw.conv_id ?? ""));
    if (!newConvId) continue;
    if (opt.dryRun) continue;
    await db
      .insert(schema.reports)
      .values({
        legacy_id: String(raw.id ?? "") || null,
        conv_id: newConvId,
        conv_title: (raw.conv_title as string) ?? null,
        conv_author_name: (raw.conv_author_name as string) ?? null,
        conv_author_email: lower(raw.conv_author_email),
        reporter_email: lower(raw.reporter_email) ?? "unknown@convs.local",
        reporter_name: (raw.reporter_name as string) ?? null,
        reason: raw.reason as "hate_speech" | "harassment" | "misinformation" | "spam" | "inappropriate" | "other",
        details: (raw.details as string) ?? null,
        status: ((raw.status as string) ?? "pending") as "pending" | "reviewed" | "dismissed" | "action_taken",
        created_date: toDate(raw.created_date) ?? undefined,
      } as never)
      .onConflictDoNothing();
  }

  // -- Counter recompute + report --
  const diffs: DiffRow[] = [];
  if (!opt.dryRun) {
    const rows = await db.select().from(schema.convs);
    for (const conv of rows) {
      const [{ n: cc }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.comments)
        .where(eq(schema.comments.conv_id, conv.id));
      const [{ n: sc }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.comments)
        .where(sql`${schema.comments.conv_id} = ${conv.id} AND ${schema.comments.stance} = 'support'`);
      const [{ n: oc }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.comments)
        .where(sql`${schema.comments.conv_id} = ${conv.id} AND ${schema.comments.stance} = 'oppose'`);
      const [{ n: bc }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.bookmarks)
        .where(sql`${schema.bookmarks.conv_id} = ${conv.id} AND ${schema.bookmarks.type} = 'conv'`);
      const record = (field: string, stored: number, actual: number) => {
        if (stored !== actual) diffs.push({ entity: "Conv", key: conv.id, field, stored, actual });
      };
      record("comment_count", conv.comment_count, cc);
      record("support_count", conv.support_count, sc);
      record("oppose_count", conv.oppose_count, oc);
      record("bookmark_count", conv.bookmark_count, bc);
      await db
        .update(schema.convs)
        .set({ comment_count: cc, support_count: sc, oppose_count: oc, bookmark_count: bc, updated_date: new Date() })
        .where(eq(schema.convs.id, conv.id));
    }
  }

  const summary = {
    counts: {
      users: users.length,
      profiles: profiles.length,
      convs: convs.length,
      comments: comments.length,
      ratings: ratings.length,
      reconvs: reconvs.length,
      bookmarks: bookmarks.length,
      follows: follows.length,
      messages: messages.length,
      notifications: notifications.length,
      reports: reports.length,
    },
    skipped,
    diffs,
  };
  await writeFile("migration-report.json", JSON.stringify(summary, null, 2));
  // eslint-disable-next-line no-console
  console.log(`[import] wrote migration-report.json (diffs: ${diffs.length})`);

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
