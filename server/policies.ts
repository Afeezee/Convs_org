// Per-entity authorisation and field-shape policy. Encodes the read/create/
// update/delete rules for every entity, plus a writable-field allow-list and
// a set of server-owned fields that are silently stripped from client input.
//
// The API layer imports these and applies them uniformly. Nothing here reads
// or writes the database; that keeps the policy easy to test in isolation.

import type { Session } from "./auth";

export type EntityName =
  | "Conv"
  | "Comment"
  | "CommentRating"
  | "Bookmark"
  | "Follow"
  | "Message"
  | "Notification"
  | "Profile"
  | "Reconv"
  | "Report"
  | "User";

export interface EntityPolicy {
  /** Table name in the Drizzle schema. */
  table:
    | "convs"
    | "comments"
    | "commentRatings"
    | "bookmarks"
    | "follows"
    | "messages"
    | "notifications"
    | "profiles"
    | "reconvs"
    | "reports"
    | "users";
  /** Columns a signed-in caller may set on create/update. Everything else in
   * the body is silently dropped. */
  writable: readonly string[];
  /** Columns forced onto every insert from the session. Values come from the
   * session, never the body. */
  forcedFromSession?: Partial<
    Record<string, (s: Session) => string | boolean | null>
  >;
  /** Columns whose value is server-owned (counts, scores, timestamps, ids). */
  serverOwned: readonly string[];
  /** Columns allowed as filter query parameters. */
  filterable: readonly string[];
  /** Columns allowed as sort keys (prefix with `-` for desc). */
  sortable: readonly string[];
  /** Anonymous callers may read at all? */
  anonymousRead: boolean;
  /** Predicate: can this caller read this row? */
  canRead: (row: Record<string, unknown>, s: Session | null) => boolean;
  /** Predicate: can this caller create with this (already-scrubbed) input? */
  canCreate: (input: Record<string, unknown>, s: Session | null) => boolean;
  canUpdate: (row: Record<string, unknown>, s: Session | null) => boolean;
  canDelete: (row: Record<string, unknown>, s: Session | null) => boolean;
}

const isOwn = (
  emailField: string,
  row: Record<string, unknown>,
  s: Session | null
) => !!s && row[emailField] === s.email;

const isStaff = (s: Session | null) =>
  !!s && (s.role === "admin" || s.role === "moderator");
const isAdmin = (s: Session | null) => !!s && s.role === "admin";

const commonServerOwned = [
  "id",
  "created_date",
  "updated_date",
  "created_by",
  "legacy_id",
  "is_sample",
];

export const policies: Record<EntityName, EntityPolicy> = {
  Conv: {
    table: "convs",
    writable: [
      "type",
      "title",
      "content",
      "rich_content",
      "media_url",
      "media_type",
      "topics",
      "status", // authors can save as draft; server ignores this if not allowed enum value
    ],
    forcedFromSession: {
      author_email: (s) => s.email,
      author_name: (s) => s.fullName ?? s.email,
    },
    serverOwned: [
      ...commonServerOwned,
      "author_email",
      "author_name",
      "support_count",
      "oppose_count",
      "comment_count",
      "bookmark_count",
      "quality_score",
      "top_flaws",
      "top_strengths",
    ],
    filterable: ["author_email", "status", "type"],
    sortable: ["created_date", "updated_date", "quality_score"],
    anonymousRead: true,
    canRead: (row, s) =>
      row.status === "published" || isOwn("author_email", row, s) || isStaff(s),
    canCreate: (_i, s) => !!s,
    canUpdate: (row, s) => isOwn("author_email", row, s) || isStaff(s),
    canDelete: (row, s) => isOwn("author_email", row, s) || isStaff(s),
  },
  Comment: {
    table: "comments",
    writable: [
      "conv_id",
      "parent_comment_id",
      "stance",
      "content",
      "highlighted_text",
      "flaw_tag",
      "strength_tag",
      "evidence_url",
      "citation",
    ],
    forcedFromSession: {
      author_email: (s) => s.email,
      author_name: (s) => s.fullName ?? s.email,
    },
    serverOwned: [
      ...commonServerOwned,
      "author_email",
      "author_name",
      "constructiveness_score",
      "status",
    ],
    filterable: ["conv_id", "author_email", "parent_comment_id", "status"],
    sortable: ["created_date"],
    anonymousRead: true,
    canRead: (row, s) =>
      row.status === "published" || isOwn("author_email", row, s) || isStaff(s),
    canCreate: (_i, s) => !!s,
    canUpdate: (row, s) => isOwn("author_email", row, s) || isStaff(s),
    canDelete: (row, s) => isOwn("author_email", row, s) || isStaff(s),
  },
  CommentRating: {
    table: "commentRatings",
    writable: ["comment_id", "rating"],
    forcedFromSession: { user_email: (s) => s.email },
    serverOwned: [...commonServerOwned, "user_email"],
    filterable: ["comment_id", "user_email"],
    sortable: ["created_date"],
    anonymousRead: true,
    canRead: () => true,
    canCreate: (_i, s) => !!s,
    canUpdate: (row, s) => isOwn("user_email", row, s),
    canDelete: (row, s) => isOwn("user_email", row, s),
  },
  Bookmark: {
    table: "bookmarks",
    writable: ["conv_id", "type", "comment_id", "note"],
    forcedFromSession: { user_email: (s) => s.email },
    serverOwned: [...commonServerOwned, "user_email"],
    filterable: ["user_email", "conv_id", "type"],
    sortable: ["created_date"],
    anonymousRead: false,
    canRead: (row, s) => isOwn("user_email", row, s),
    canCreate: (_i, s) => !!s,
    canUpdate: (row, s) => isOwn("user_email", row, s),
    canDelete: (row, s) => isOwn("user_email", row, s),
  },
  Follow: {
    table: "follows",
    writable: ["following_email"],
    forcedFromSession: { follower_email: (s) => s.email },
    serverOwned: [...commonServerOwned, "follower_email"],
    filterable: ["follower_email", "following_email"],
    sortable: ["created_date"],
    anonymousRead: false,
    canRead: (row, s) => isOwn("follower_email", row, s) || isAdmin(s),
    canCreate: (_i, s) => !!s,
    canUpdate: (row, s) => isOwn("follower_email", row, s) || isAdmin(s),
    canDelete: (row, s) => isOwn("follower_email", row, s) || isAdmin(s),
  },
  Message: {
    table: "messages",
    writable: [
      "conversation_id",
      "receiver_email",
      "receiver_name",
      "content",
      "media_url",
      "is_read",
      "is_debate_invite",
      "invited_conv_id",
    ],
    forcedFromSession: {
      sender_email: (s) => s.email,
      sender_name: (s) => s.fullName ?? s.email,
    },
    serverOwned: [...commonServerOwned, "sender_email", "sender_name", "status"],
    filterable: [
      "conversation_id",
      "sender_email",
      "receiver_email",
      "is_read",
      "status",
    ],
    sortable: ["created_date"],
    anonymousRead: false,
    canRead: (row, s) =>
      !!s && (row.sender_email === s.email || row.receiver_email === s.email),
    canCreate: (_i, s) => !!s,
    canUpdate: (row, s) =>
      !!s && (row.sender_email === s.email || row.receiver_email === s.email),
    canDelete: (row, s) =>
      !!s && (row.sender_email === s.email || row.receiver_email === s.email),
  },
  Notification: {
    table: "notifications",
    // No client-side create — the server hooks own the notification writes.
    writable: ["is_read"],
    serverOwned: [
      ...commonServerOwned,
      "user_email",
      "type",
      "from_email",
      "from_name",
      "conv_id",
      "comment_id",
      "message",
    ],
    filterable: ["user_email", "is_read", "type"],
    sortable: ["created_date"],
    anonymousRead: false,
    canRead: (row, s) => isOwn("user_email", row, s),
    canCreate: () => false,
    canUpdate: (row, s) => isOwn("user_email", row, s),
    canDelete: (row, s) => isOwn("user_email", row, s),
  },
  Profile: {
    table: "profiles",
    writable: [
      "full_name",
      "username",
      "bio",
      "profile_image",
      "cover_image",
    ],
    forcedFromSession: { email: (s) => s.email },
    serverOwned: [
      ...commonServerOwned,
      "email",
      "followers_count",
      "following_count",
      "convs_count",
      "support_count",
      "oppose_count",
      "avg_quality_score",
      "badges",
    ],
    filterable: ["email", "username"],
    sortable: ["created_date"],
    anonymousRead: true,
    canRead: () => true,
    canCreate: (_i, s) => !!s,
    canUpdate: (row, s) => isOwn("email", row, s) || isAdmin(s),
    canDelete: (_row, s) => isAdmin(s),
  },
  Reconv: {
    table: "reconvs",
    writable: [
      "original_conv_id",
      "original_author_email",
      "original_author_name",
      "thought",
    ],
    forcedFromSession: {
      user_email: (s) => s.email,
      user_name: (s) => s.fullName ?? s.email,
    },
    serverOwned: [...commonServerOwned, "user_email", "user_name"],
    filterable: ["user_email", "original_conv_id"],
    sortable: ["created_date"],
    anonymousRead: true,
    canRead: () => true,
    canCreate: (_i, s) => !!s,
    canUpdate: (row, s) => isOwn("user_email", row, s) || isAdmin(s),
    canDelete: (row, s) => isOwn("user_email", row, s) || isAdmin(s),
  },
  Report: {
    table: "reports",
    writable: [
      "conv_id",
      "conv_title",
      "conv_author_name",
      "conv_author_email",
      "reason",
      "details",
      // Staff-only in practice — canUpdate already gates non-staff callers.
      "status",
    ],
    forcedFromSession: {
      reporter_email: (s) => s.email,
      reporter_name: (s) => s.fullName ?? s.email,
    },
    serverOwned: [
      ...commonServerOwned,
      "reporter_email",
      "reporter_name",
      "status",
    ],
    filterable: ["status", "conv_id", "reporter_email"],
    sortable: ["created_date"],
    anonymousRead: false,
    canRead: (_row, s) => isStaff(s),
    canCreate: (_i, s) => !!s,
    canUpdate: (_row, s) => isStaff(s),
    canDelete: (_row, s) => isStaff(s),
  },
  User: {
    // Access is admin-only; the frontend hits /auth/me for the self case.
    // `role` is included so admins can promote/demote; the router strips it
    // for non-admin callers before write (see router.ts).
    table: "users",
    writable: ["theme", "role"],
    serverOwned: [
      ...commonServerOwned,
      "clerk_user_id",
      "email",
      "email_verified",
      "full_name",
      "role",
      "username",
      "bio",
      "profile_image",
      "cover_image",
      "badges",
    ],
    filterable: ["email", "role"],
    sortable: ["created_date"],
    anonymousRead: false,
    canRead: (_row, s) => isAdmin(s),
    canCreate: () => false, // Clerk sync only
    canUpdate: (row, s) => isAdmin(s) || (!!s && row.email === s.email),
    canDelete: (_row, s) => isAdmin(s),
  },
};

/** Strip disallowed keys from a body and force session-owned fields. */
export function scrub(
  entity: EntityName,
  input: Record<string, unknown>,
  session: Session,
  mode: "create" | "update"
): Record<string, unknown> {
  const p = policies[entity];
  const out: Record<string, unknown> = {};
  for (const k of p.writable) {
    if (k in input) out[k] = input[k];
  }
  if (mode === "create" && p.forcedFromSession) {
    for (const [k, fn] of Object.entries(p.forcedFromSession)) {
      out[k] = fn!(session);
    }
    out.created_by = session.email;
  }
  if (mode === "update") {
    out.updated_date = new Date();
  }
  return out;
}
