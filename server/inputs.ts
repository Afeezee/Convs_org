// Zod input schemas per entity, applied on the request body before `scrub`
// and before any DB write. These enforce shape and length limits that the
// prefilter doesn't cover (structural / enum validation, well-formed URLs).
//
// The schemas only cover fields the client is allowed to send. Server-owned
// fields are stripped later; we don't include them here.

import { z } from "zod";
import { FLAWS_SET, STRENGTHS_SET } from "../src/shared/tags.js";
import type { EntityName } from "./policies";

const url = z.string().url().max(2000).optional().nullable();

const convBase = z.object({
  type: z.enum(["short", "long", "media"]).default("short"),
  title: z.string().max(200).optional().nullable(),
  content: z.string().min(1),
  rich_content: z.string().max(20000).optional().nullable(),
  media_url: url,
  media_type: z.enum(["image", "video", "none"]).default("none"),
  topics: z.array(z.string().min(1).max(64)).max(20).optional(),
  status: z.enum(["published", "moderated", "draft"]).default("published"),
});

const convCreate = convBase.superRefine((v, ctx) => {
  const cap =
    v.type === "long" ? 6000 : v.type === "short" || v.type === "media" ? 500 : 500;
  if (v.content.length > cap) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Content too long for type=${v.type} (max ${cap})`,
      path: ["content"],
    });
  }
});

const commentCreate = z
  .object({
    conv_id: z.string().uuid(),
    parent_comment_id: z.string().uuid().optional().nullable(),
    stance: z.enum(["support", "oppose", "clarification"]),
    content: z.string().min(1).max(2000),
    highlighted_text: z.string().max(2000).optional().nullable(),
    flaw_tag: z.string().optional().nullable(),
    strength_tag: z.string().optional().nullable(),
    evidence_url: url,
    citation: z.string().max(500).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.stance === "oppose" && v.flaw_tag && !FLAWS_SET.has(v.flaw_tag)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "flaw_tag not in the allowed list",
        path: ["flaw_tag"],
      });
    }
    if (v.stance === "support" && v.strength_tag && !STRENGTHS_SET.has(v.strength_tag)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "strength_tag not in the allowed list",
        path: ["strength_tag"],
      });
    }
  });

const messageCreate = z.object({
  conversation_id: z.string().min(1).max(500),
  receiver_email: z.string().email(),
  receiver_name: z.string().max(120).optional().nullable(),
  content: z.string().min(1).max(2000),
  media_url: url,
  is_debate_invite: z.boolean().optional(),
  invited_conv_id: z.string().uuid().optional().nullable(),
});

const followCreate = z.object({
  following_email: z.string().email(),
});

const bookmarkCreate = z.object({
  conv_id: z.string().uuid(),
  type: z.enum(["conv", "comment", "highlight"]).default("conv"),
  comment_id: z.string().uuid().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

const reconvCreate = z.object({
  original_conv_id: z.string().uuid(),
  original_author_email: z.string().email(),
  original_author_name: z.string().max(120),
  thought: z.string().max(1000).optional().nullable(),
});

const reportCreate = z.object({
  conv_id: z.string().uuid(),
  conv_title: z.string().max(300).optional().nullable(),
  conv_author_name: z.string().max(120).optional().nullable(),
  conv_author_email: z.string().email().optional().nullable(),
  reason: z.enum([
    "hate_speech",
    "harassment",
    "misinformation",
    "spam",
    "inappropriate",
    "other",
  ]),
  details: z.string().max(2000).optional().nullable(),
});

const profileCreate = z.object({
  full_name: z.string().min(1).max(120),
  username: z.string().max(60).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  profile_image: url,
  cover_image: url,
});

const commentRatingCreate = z.object({
  comment_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
});

const notificationUpdate = z.object({
  is_read: z.boolean(),
});

const userUpdate = z
  .object({
    theme: z.enum(["light", "dark"]).optional(),
    role: z.enum(["user", "moderator", "admin", "verified_expert"]).optional(),
  })
  .strict();

const reportUpdate = z
  .object({
    status: z
      .enum(["pending", "reviewed", "dismissed", "action_taken"])
      .optional(),
    details: z.string().max(2000).optional().nullable(),
  })
  .strict();

export type EntityInputSchemas = Partial<
  Record<EntityName, { create?: z.ZodTypeAny; update?: z.ZodTypeAny }>
>;

export const inputs: EntityInputSchemas = {
  Conv: { create: convCreate, update: convBase.partial() },
  Comment: { create: commentCreate, update: commentCreate.partial() },
  Message: { create: messageCreate },
  Follow: { create: followCreate },
  Bookmark: { create: bookmarkCreate },
  Reconv: { create: reconvCreate },
  Report: { create: reportCreate, update: reportUpdate },
  Profile: { create: profileCreate, update: profileCreate.partial() },
  CommentRating: { create: commentRatingCreate, update: commentRatingCreate.partial() },
  Notification: { update: notificationUpdate },
  User: { update: userUpdate },
};
