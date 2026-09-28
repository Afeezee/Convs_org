// Drizzle schema for Convs. Column names are snake_case so imported legacy
// data and the existing UI both map straight in. Every row carries `id`,
// `created_date`, `updated_date`, `created_by`, and an optional `legacy_id`
// for idempotent import.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------- Enums ----------

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "moderator",
  "admin",
  "verified_expert",
]);

export const themeEnum = pgEnum("theme", ["light", "dark"]);

export const convTypeEnum = pgEnum("conv_type", ["short", "long", "media"]);
export const convStatusEnum = pgEnum("conv_status", [
  "published",
  "moderated",
  "draft",
]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video", "none"]);

export const commentStanceEnum = pgEnum("comment_stance", [
  "support",
  "oppose",
  "clarification",
]);
export const commentStatusEnum = pgEnum("comment_status", [
  "published",
  "moderated",
  "pending",
]);

export const bookmarkTypeEnum = pgEnum("bookmark_type", [
  "conv",
  "comment",
  "highlight",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "sent",
  "pending",
  "blocked",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "follow",
  "comment",
  "support",
  "oppose",
  "mention",
  "flaw_tag",
  "highlight_reply",
]);

export const reportReasonEnum = pgEnum("report_reason", [
  "hate_speech",
  "harassment",
  "misinformation",
  "spam",
  "inappropriate",
  "other",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "reviewed",
  "dismissed",
  "action_taken",
]);

export const moderationKindEnum = pgEnum("moderation_kind", [
  "conv",
  "comment",
  "message",
]);
export const moderationActionEnum = pgEnum("moderation_action", [
  "approve",
  "warn",
  "block",
  "queued",
]);
export const moderationQueueStatusEnum = pgEnum("moderation_queue_status", [
  "queued",
  "retrying",
  "done",
  "failed",
]);

// ---------- Shared column helpers ----------

// Factory (not a static object) so each table gets its own fresh column
// definitions. Drizzle Kit derives constraint names from the column object
// identity — a static shared object would generate the same `<x>_legacy_id_unique`
// constraint name for every table, and Postgres rejects the duplicate.
const baseColumns = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  created_date: timestamp("created_date", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_date: timestamp("updated_date", { withTimezone: true }),
  created_by: text("created_by"),
  legacy_id: text("legacy_id").unique(),
  is_sample: boolean("is_sample").default(false).notNull(),
});

// ---------- Core account rows ----------

// The `users` table is our infra table: it links a person's Clerk account,
// email and role. The public-facing
// `Profile` table (below) carries the profile fields the UI reads.
export const users = pgTable(
  "users",
  {
    ...baseColumns(),
    clerk_user_id: text("clerk_user_id").unique(),
    email: text("email").notNull().unique(),
    email_verified: boolean("email_verified").default(false).notNull(),
    full_name: text("full_name"),
    role: userRoleEnum("role").default("user").notNull(),
    theme: themeEnum("theme").default("light").notNull(),
    // The User-entity profile-shaped fields exist here too so a client that
    // hydrated User can still read them; the authoritative copy is Profile.
    username: text("username"),
    bio: text("bio"),
    profile_image: text("profile_image"),
    cover_image: text("cover_image"),
    badges: text("badges").array().default(sql`ARRAY[]::text[]`),
  },
  (t) => ({
    email_idx: uniqueIndex("users_email_idx").on(t.email),
    clerk_idx: uniqueIndex("users_clerk_user_id_idx").on(t.clerk_user_id),
  })
);

export const profiles = pgTable(
  "profiles",
  {
    ...baseColumns(),
    email: text("email").notNull().unique(),
    full_name: text("full_name").notNull(),
    username: text("username"),
    bio: text("bio"),
    profile_image: text("profile_image"),
    cover_image: text("cover_image"),
    followers_count: integer("followers_count").default(0).notNull(),
    following_count: integer("following_count").default(0).notNull(),
    convs_count: integer("convs_count").default(0).notNull(),
    support_count: integer("support_count").default(0).notNull(),
    oppose_count: integer("oppose_count").default(0).notNull(),
    avg_quality_score: integer("avg_quality_score").default(0).notNull(),
    badges: text("badges").array().default(sql`ARRAY[]::text[]`),
  },
  (t) => ({
    email_idx: uniqueIndex("profiles_email_idx").on(t.email),
    username_idx: index("profiles_username_idx").on(t.username),
  })
);

// ---------- Content ----------

export const convs = pgTable(
  "convs",
  {
    ...baseColumns(),
    author_email: text("author_email").notNull(),
    author_name: text("author_name").notNull(),
    type: convTypeEnum("type").default("short").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    rich_content: text("rich_content"),
    media_url: text("media_url"),
    media_type: mediaTypeEnum("media_type").default("none").notNull(),
    topics: text("topics").array().default(sql`ARRAY[]::text[]`),
    support_count: integer("support_count").default(0).notNull(),
    oppose_count: integer("oppose_count").default(0).notNull(),
    comment_count: integer("comment_count").default(0).notNull(),
    bookmark_count: integer("bookmark_count").default(0).notNull(),
    quality_score: integer("quality_score").default(0).notNull(),
    top_flaws: text("top_flaws").array().default(sql`ARRAY[]::text[]`),
    top_strengths: text("top_strengths").array().default(sql`ARRAY[]::text[]`),
    status: convStatusEnum("status").default("published").notNull(),
  },
  (t) => ({
    status_created_idx: index("convs_status_created_idx").on(
      t.status,
      t.created_date
    ),
    author_created_idx: index("convs_author_created_idx").on(
      t.author_email,
      t.created_date
    ),
  })
);

export const comments = pgTable(
  "comments",
  {
    ...baseColumns(),
    conv_id: uuid("conv_id").notNull(),
    parent_comment_id: uuid("parent_comment_id"),
    author_email: text("author_email").notNull(),
    author_name: text("author_name").notNull(),
    stance: commentStanceEnum("stance").notNull(),
    content: text("content").notNull(),
    highlighted_text: text("highlighted_text"),
    flaw_tag: text("flaw_tag"),
    strength_tag: text("strength_tag"),
    evidence_url: text("evidence_url"),
    citation: text("citation"),
    constructiveness_score: integer("constructiveness_score").default(0).notNull(),
    status: commentStatusEnum("status").default("published").notNull(),
  },
  (t) => ({
    conv_created_idx: index("comments_conv_created_idx").on(
      t.conv_id,
      t.created_date
    ),
    author_idx: index("comments_author_idx").on(t.author_email),
  })
);

export const commentRatings = pgTable(
  "comment_ratings",
  {
    ...baseColumns(),
    comment_id: uuid("comment_id").notNull(),
    user_email: text("user_email").notNull(),
    rating: integer("rating").notNull(),
  },
  (t) => ({
    // Only one rating per (comment, user)
    comment_user_uq: uniqueIndex("comment_ratings_comment_user_uq").on(
      t.comment_id,
      t.user_email
    ),
  })
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    ...baseColumns(),
    user_email: text("user_email").notNull(),
    conv_id: uuid("conv_id").notNull(),
    type: bookmarkTypeEnum("type").default("conv").notNull(),
    comment_id: uuid("comment_id"),
    note: text("note"),
  },
  (t) => ({
    user_conv_idx: index("bookmarks_user_conv_idx").on(t.user_email, t.conv_id),
    // Prevent duplicate bookmarks for the same (user, conv, type, comment)
    user_conv_uq: uniqueIndex("bookmarks_user_conv_uq").on(
      t.user_email,
      t.conv_id,
      t.type
    ),
  })
);

export const follows = pgTable(
  "follows",
  {
    ...baseColumns(),
    follower_email: text("follower_email").notNull(),
    following_email: text("following_email").notNull(),
  },
  (t) => ({
    pair_uq: uniqueIndex("follows_pair_uq").on(
      t.follower_email,
      t.following_email
    ),
  })
);

export const reconvs = pgTable(
  "reconvs",
  {
    ...baseColumns(),
    user_email: text("user_email").notNull(),
    user_name: text("user_name").notNull(),
    original_conv_id: uuid("original_conv_id").notNull(),
    original_author_email: text("original_author_email").notNull(),
    original_author_name: text("original_author_name").notNull(),
    thought: text("thought"),
  },
  (t) => ({
    user_orig_uq: uniqueIndex("reconvs_user_orig_uq").on(
      t.user_email,
      t.original_conv_id
    ),
  })
);

export const messages = pgTable(
  "messages",
  {
    ...baseColumns(),
    conversation_id: text("conversation_id").notNull(),
    sender_email: text("sender_email").notNull(),
    sender_name: text("sender_name"),
    receiver_email: text("receiver_email").notNull(),
    receiver_name: text("receiver_name"),
    content: text("content").notNull(),
    media_url: text("media_url"),
    is_read: boolean("is_read").default(false).notNull(),
    is_debate_invite: boolean("is_debate_invite").default(false).notNull(),
    invited_conv_id: uuid("invited_conv_id"),
    status: messageStatusEnum("status").default("sent").notNull(),
  },
  (t) => ({
    conv_created_idx: index("messages_conv_created_idx").on(
      t.conversation_id,
      t.created_date
    ),
    receiver_read_idx: index("messages_receiver_read_idx").on(
      t.receiver_email,
      t.is_read
    ),
  })
);

export const notifications = pgTable(
  "notifications",
  {
    ...baseColumns(),
    user_email: text("user_email").notNull(),
    type: notificationTypeEnum("type").notNull(),
    from_email: text("from_email"),
    from_name: text("from_name"),
    conv_id: uuid("conv_id"),
    comment_id: uuid("comment_id"),
    message: text("message").notNull(),
    is_read: boolean("is_read").default(false).notNull(),
  },
  (t) => ({
    user_read_created_idx: index("notifications_user_read_created_idx").on(
      t.user_email,
      t.is_read,
      t.created_date
    ),
  })
);

export const reports = pgTable("reports", {
  ...baseColumns(),
  conv_id: uuid("conv_id").notNull(),
  conv_title: text("conv_title"),
  conv_author_name: text("conv_author_name"),
  conv_author_email: text("conv_author_email"),
  reporter_email: text("reporter_email").notNull(),
  reporter_name: text("reporter_name"),
  reason: reportReasonEnum("reason").notNull(),
  details: text("details"),
  status: reportStatusEnum("status").default("pending").notNull(),
});

// ---------- Infrastructure tables ----------

export const moderationEvents = pgTable("moderation_events", {
  ...baseColumns(),
  kind: moderationKindEnum("kind").notNull(),
  entity_id: uuid("entity_id"),
  content_hash: text("content_hash").notNull(),
  verdict: jsonb("verdict"),
  action: moderationActionEnum("action").notNull(),
  model: text("model").notNull(),
  prompt_tokens: integer("prompt_tokens").default(0).notNull(),
  completion_tokens: integer("completion_tokens").default(0).notNull(),
  total_tokens: integer("total_tokens").default(0).notNull(),
});

export const moderationCache = pgTable(
  "moderation_cache",
  {
    content_hash: text("content_hash").primaryKey(),
    verdict: jsonb("verdict").notNull(),
    action: moderationActionEnum("action").notNull(),
    model: text("model").notNull(),
    created_date: timestamp("created_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // TTL is enforced at read time (7 days).
  }
);

export const moderationQueue = pgTable(
  "moderation_queue",
  {
    ...baseColumns(),
    kind: moderationKindEnum("kind").notNull(),
    entity_id: uuid("entity_id").notNull(),
    content_hash: text("content_hash").notNull(),
    payload: jsonb("payload").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    last_error: text("last_error"),
    status: moderationQueueStatusEnum("status").default("queued").notNull(),
    next_retry_at: timestamp("next_retry_at", { withTimezone: true }),
  },
  (t) => ({
    status_next_idx: index("moderation_queue_status_next_idx").on(
      t.status,
      t.next_retry_at
    ),
  })
);

// Token/rate ledger shared across serverless instances (per-minute and per-day
// buckets). Each row's `bucket_key` is `rpm:YYYYMMDDHHMM` / `tpm:...` /
// `tpd:YYYYMMDD` etc.
export const llmUsage = pgTable("llm_usage", {
  bucket_key: text("bucket_key").primaryKey(),
  count: integer("count").default(0).notNull(),
  updated_date: timestamp("updated_date", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    window_start: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").default(0).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.key, t.window_start] }),
  })
);

// ---------- Type exports ----------

export type Conv = typeof convs.$inferSelect;
export type NewConv = typeof convs.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Follow = typeof follows.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type CommentRating = typeof commentRatings.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Reconv = typeof reconvs.$inferSelect;
export type Report = typeof reports.$inferSelect;
