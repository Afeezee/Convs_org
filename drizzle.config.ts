import type { Config } from "drizzle-kit";

// Uses the unpooled connection string for migrations (`neon-http`-backed pooler
// doesn't support DDL transactions on some plans). Pooled URL is for the
// serverless runtime.
export default {
  schema: "./server/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
