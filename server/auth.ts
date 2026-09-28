import { createClerkClient, verifyToken } from "@clerk/backend";
import type { Context } from "hono";
import { env, adminEmails } from "./env.js";
import { db, schema } from "./db.js";
import { eq } from "drizzle-orm";
import { unauthorised, forbidden } from "./errors.js";

let clerkClient: ReturnType<typeof createClerkClient> | null = null;
function clerk() {
  if (!clerkClient) {
    clerkClient = createClerkClient({ secretKey: env().CLERK_SECRET_KEY });
  }
  return clerkClient;
}

export interface Session {
  userId: string; // internal users.id
  clerkUserId: string;
  email: string;
  role: "user" | "moderator" | "admin" | "verified_expert";
  fullName: string | null;
}

/**
 * Verifies the Clerk session token from Authorization: Bearer <jwt>. Upserts
 * (or claims) the internal `users` row on first sign-in. Returns null when
 * there is no token — anonymous access is allowed for endpoints that opt in.
 */
export async function loadSession(c: Context): Promise<Session | null> {
  const authz = c.req.header("Authorization");
  if (!authz || !authz.startsWith("Bearer ")) return null;
  const token = authz.slice("Bearer ".length).trim();
  if (!token) return null;

  const claims = await verifyToken(token, {
    secretKey: env().CLERK_SECRET_KEY,
  }).catch(() => null);
  if (!claims || !claims.sub) return null;

  const clerkUserId = claims.sub;

  // Fetch full user record to get the verified primary email address. The
  // JWT itself may not include it depending on template.
  const clerkUser = await clerk().users.getUser(clerkUserId).catch(() => null);
  if (!clerkUser) return null;
  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  );
  if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
    return null;
  }
  const email = primaryEmail.emailAddress.toLowerCase();
  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    null;

  const database = db();

  // Look up by clerk_user_id first, then by email to claim an imported row.
  const existing = await database
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerk_user_id, clerkUserId))
    .limit(1);
  let row = existing[0];

  if (!row) {
    const byEmail = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (byEmail[0]) {
      const [claimed] = await database
        .update(schema.users)
        .set({
          clerk_user_id: clerkUserId,
          email_verified: true,
          full_name: byEmail[0].full_name ?? fullName,
          updated_date: new Date(),
        })
        .where(eq(schema.users.id, byEmail[0].id))
        .returning();
      row = claimed;
    }
  }

  if (!row) {
    // Bootstrap: admin role from env ADMIN_EMAILS (verified only).
    const role = adminEmails().has(email) ? "admin" : "user";
    const [created] = await database
      .insert(schema.users)
      .values({
        clerk_user_id: clerkUserId,
        email,
        email_verified: true,
        full_name: fullName,
        role,
        created_by: email,
      })
      .returning();
    row = created;
  } else if (adminEmails().has(email) && row.role !== "admin") {
    // Keep admins in sync with env, but never demote a manually-elevated user.
    const [promoted] = await database
      .update(schema.users)
      .set({ role: "admin", updated_date: new Date() })
      .where(eq(schema.users.id, row.id))
      .returning();
    row = promoted;
  }

  return {
    userId: row.id,
    clerkUserId,
    email: row.email,
    role: row.role,
    fullName: row.full_name,
  };
}

export function requireSession(session: Session | null): Session {
  if (!session) throw unauthorised();
  return session;
}

export function isStaff(session: Session | null): boolean {
  return !!session && (session.role === "admin" || session.role === "moderator");
}

export function requireStaff(session: Session | null): Session {
  const s = requireSession(session);
  if (!isStaff(s)) throw forbidden("Staff only");
  return s;
}

export function requireAdmin(session: Session | null): Session {
  const s = requireSession(session);
  if (s.role !== "admin") throw forbidden("Admin only");
  return s;
}
