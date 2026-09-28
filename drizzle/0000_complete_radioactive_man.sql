CREATE TYPE "public"."bookmark_type" AS ENUM('conv', 'comment', 'highlight');--> statement-breakpoint
CREATE TYPE "public"."comment_stance" AS ENUM('support', 'oppose', 'clarification');--> statement-breakpoint
CREATE TYPE "public"."comment_status" AS ENUM('published', 'moderated', 'pending');--> statement-breakpoint
CREATE TYPE "public"."conv_status" AS ENUM('published', 'moderated', 'draft');--> statement-breakpoint
CREATE TYPE "public"."conv_type" AS ENUM('short', 'long', 'media');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'video', 'none');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sent', 'pending', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."moderation_action" AS ENUM('approve', 'warn', 'block', 'queued');--> statement-breakpoint
CREATE TYPE "public"."moderation_kind" AS ENUM('conv', 'comment', 'message');--> statement-breakpoint
CREATE TYPE "public"."moderation_queue_status" AS ENUM('queued', 'retrying', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('follow', 'comment', 'support', 'oppose', 'mention', 'flaw_tag', 'highlight_reply');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('hate_speech', 'harassment', 'misinformation', 'spam', 'inappropriate', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'reviewed', 'dismissed', 'action_taken');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('light', 'dark');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin', 'verified_expert');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"user_email" text NOT NULL,
	"conv_id" uuid NOT NULL,
	"type" "bookmark_type" DEFAULT 'conv' NOT NULL,
	"comment_id" uuid,
	"note" text,
	CONSTRAINT "bookmarks_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comment_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_email" text NOT NULL,
	"rating" integer NOT NULL,
	CONSTRAINT "comment_ratings_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"conv_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"author_email" text NOT NULL,
	"author_name" text NOT NULL,
	"stance" "comment_stance" NOT NULL,
	"content" text NOT NULL,
	"highlighted_text" text,
	"flaw_tag" text,
	"strength_tag" text,
	"evidence_url" text,
	"citation" text,
	"constructiveness_score" integer DEFAULT 0 NOT NULL,
	"status" "comment_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "comments_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "convs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"author_email" text NOT NULL,
	"author_name" text NOT NULL,
	"type" "conv_type" DEFAULT 'short' NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"rich_content" text,
	"media_url" text,
	"media_type" "media_type" DEFAULT 'none' NOT NULL,
	"topics" text[] DEFAULT ARRAY[]::text[],
	"support_count" integer DEFAULT 0 NOT NULL,
	"oppose_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"bookmark_count" integer DEFAULT 0 NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"top_flaws" text[] DEFAULT ARRAY[]::text[],
	"top_strengths" text[] DEFAULT ARRAY[]::text[],
	"status" "conv_status" DEFAULT 'published' NOT NULL,
	CONSTRAINT "convs_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"follower_email" text NOT NULL,
	"following_email" text NOT NULL,
	CONSTRAINT "follows_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_usage" (
	"bucket_key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"conversation_id" text NOT NULL,
	"sender_email" text NOT NULL,
	"sender_name" text,
	"receiver_email" text NOT NULL,
	"receiver_name" text,
	"content" text NOT NULL,
	"media_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_debate_invite" boolean DEFAULT false NOT NULL,
	"invited_conv_id" uuid,
	"status" "message_status" DEFAULT 'sent' NOT NULL,
	CONSTRAINT "messages_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_cache" (
	"content_hash" text PRIMARY KEY NOT NULL,
	"verdict" jsonb NOT NULL,
	"action" "moderation_action" NOT NULL,
	"model" text NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"kind" "moderation_kind" NOT NULL,
	"entity_id" uuid,
	"content_hash" text NOT NULL,
	"verdict" jsonb,
	"action" "moderation_action" NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "moderation_events_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"kind" "moderation_kind" NOT NULL,
	"entity_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"status" "moderation_queue_status" DEFAULT 'queued' NOT NULL,
	"next_retry_at" timestamp with time zone,
	CONSTRAINT "moderation_queue_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"user_email" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"from_email" text,
	"from_name" text,
	"conv_id" uuid,
	"comment_id" uuid,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	CONSTRAINT "notifications_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"username" text,
	"bio" text,
	"profile_image" text,
	"cover_image" text,
	"followers_count" integer DEFAULT 0 NOT NULL,
	"following_count" integer DEFAULT 0 NOT NULL,
	"convs_count" integer DEFAULT 0 NOT NULL,
	"support_count" integer DEFAULT 0 NOT NULL,
	"oppose_count" integer DEFAULT 0 NOT NULL,
	"avg_quality_score" integer DEFAULT 0 NOT NULL,
	"badges" text[] DEFAULT ARRAY[]::text[],
	CONSTRAINT "profiles_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reconvs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"user_email" text NOT NULL,
	"user_name" text NOT NULL,
	"original_conv_id" uuid NOT NULL,
	"original_author_email" text NOT NULL,
	"original_author_name" text NOT NULL,
	"thought" text,
	CONSTRAINT "reconvs_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"conv_id" uuid NOT NULL,
	"conv_title" text,
	"conv_author_name" text,
	"conv_author_email" text,
	"reporter_email" text NOT NULL,
	"reporter_name" text,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	CONSTRAINT "reports_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_date" timestamp with time zone,
	"created_by" text,
	"legacy_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"clerk_user_id" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"full_name" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"theme" "theme" DEFAULT 'light' NOT NULL,
	"username" text,
	"bio" text,
	"profile_image" text,
	"cover_image" text,
	"badges" text[] DEFAULT ARRAY[]::text[],
	CONSTRAINT "users_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmarks_user_conv_idx" ON "bookmarks" USING btree ("user_email","conv_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookmarks_user_conv_uq" ON "bookmarks" USING btree ("user_email","conv_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "comment_ratings_comment_user_uq" ON "comment_ratings" USING btree ("comment_id","user_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_conv_created_idx" ON "comments" USING btree ("conv_id","created_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_author_idx" ON "comments" USING btree ("author_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "convs_status_created_idx" ON "convs" USING btree ("status","created_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "convs_author_created_idx" ON "convs" USING btree ("author_email","created_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "follows_pair_uq" ON "follows" USING btree ("follower_email","following_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conv_created_idx" ON "messages" USING btree ("conversation_id","created_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_receiver_read_idx" ON "messages" USING btree ("receiver_email","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_queue_status_next_idx" ON "moderation_queue" USING btree ("status","next_retry_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_created_idx" ON "notifications" USING btree ("user_email","is_read","created_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_username_idx" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reconvs_user_orig_uq" ON "reconvs" USING btree ("user_email","original_conv_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");