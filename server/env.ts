import { z } from "zod";

// Validated on boot. Any missing/invalid value fails fast with a readable
// message so a broken Vercel deploy shows the cause on first request.
const schema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  MODERATION_MODEL: z.string().default("qwen/qwen3.8-27b"),
  MODERATION_FALLBACK_MODEL: z.string().optional(),
  GROQ_RPM_CEILING: z.coerce.number().int().positive().default(25),
  GROQ_TPM_CEILING: z.coerce.number().int().positive().default(7000),
  GROQ_TPD_CEILING: z.coerce.number().int().positive().default(180000),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  ADMIN_EMAILS: z.string().default(""),
  CRON_SECRET: z.string().min(1).optional(),
  LEGACY_MEDIA_HOST: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "?"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function adminEmails(): Set<string> {
  return new Set(
    env()
      .ADMIN_EMAILS.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}
