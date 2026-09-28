// Clerk webhook handler. Verifies the Svix signature (Clerk signs every
// delivery with the endpoint's shared secret) and applies the change to our
// `users` table: email/name sync on `user.updated`, cascade delete on
// `user.deleted`.
//
// Signature verification is mandatory; a delivery without a valid signature
// is ignored with 401.

import type { Context } from "hono";
import { Webhook } from "svix";
import { env } from "../env.js";
import { db, schema } from "../db.js";
import { eq } from "drizzle-orm";
import { onUserDelete } from "../hooks.js";
import { HttpError } from "../errors.js";

interface ClerkEvent {
  type: string;
  data: Record<string, unknown>;
}

export async function handleClerkWebhook(c: Context): Promise<Response> {
  const secret = env().CLERK_WEBHOOK_SECRET;
  if (!secret) {
    throw new HttpError(
      501,
      "webhook_disabled",
      "CLERK_WEBHOOK_SECRET not set on this deployment"
    );
  }

  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new HttpError(401, "unauthorised", "Missing Svix headers");
  }

  // Body must be the exact bytes Clerk sent; JSON.parse it after verification.
  const raw = await c.req.text();
  let event: ClerkEvent;
  try {
    event = new Webhook(secret).verify(raw, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Clerk webhook signature verification failed", err);
    throw new HttpError(401, "unauthorised", "Bad signature");
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const clerkUserId = String((event.data as { id?: unknown }).id ?? "");
      if (!clerkUserId) break;
      const emailAddresses =
        (event.data.email_addresses as Array<{
          id?: string;
          email_address?: string;
          verification?: { status?: string };
        }>) ?? [];
      const primaryId = (event.data as { primary_email_address_id?: string })
        .primary_email_address_id;
      const primary = emailAddresses.find((e) => e.id === primaryId);
      if (!primary?.email_address) break;
      const verified = primary.verification?.status === "verified";
      if (!verified) break;
      const email = primary.email_address.toLowerCase();
      const firstName = (event.data as { first_name?: string }).first_name ?? "";
      const lastName = (event.data as { last_name?: string }).last_name ?? "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

      const database = db();
      const [existing] = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.clerk_user_id, clerkUserId))
        .limit(1);
      if (existing) {
        await database
          .update(schema.users)
          .set({
            email,
            email_verified: true,
            full_name: existing.full_name ?? fullName,
            updated_date: new Date(),
          })
          .where(eq(schema.users.id, existing.id));
      } else {
        // Claim by email if we already imported this account.
        const [byEmail] = await database
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);
        if (byEmail) {
          await database
            .update(schema.users)
            .set({
              clerk_user_id: clerkUserId,
              email_verified: true,
              full_name: byEmail.full_name ?? fullName,
              updated_date: new Date(),
            })
            .where(eq(schema.users.id, byEmail.id));
        } else {
          await database.insert(schema.users).values({
            clerk_user_id: clerkUserId,
            email,
            email_verified: true,
            full_name: fullName,
            created_by: email,
          });
        }
      }
      break;
    }
    case "user.deleted": {
      const clerkUserId = String((event.data as { id?: unknown }).id ?? "");
      if (!clerkUserId) break;
      const database = db();
      const [row] = await database
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.clerk_user_id, clerkUserId))
        .limit(1);
      if (row) await onUserDelete(row.id);
      break;
    }
    default:
      // Ignore other event types (session.created, email.*, etc.)
      break;
  }

  return c.json({ ok: true });
}
