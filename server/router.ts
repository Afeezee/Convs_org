// Hono router mounted at /api. All entity and integration endpoints live
// here; the /api/[...path].ts Vercel handler forwards every request through.

import { Hono } from "hono";
import { HttpError, badRequest, notFound, unprocessable } from "./errors";
import { loadSession, requireSession, requireAdmin, requireStaff } from "./auth";
import { policies, EntityName, scrub } from "./policies";
import { db, schema } from "./db";
import { and, eq, SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { parseFilters, parseLimit, parseSort, toRecord, entityByName } from "./query";
import {
  onCommentCreate,
  onCommentDelete,
  onFollowCreate,
  onFollowDelete,
  onBookmarkCreate,
  onBookmarkDelete,
  onConvCreate,
  onConvDelete,
  onReconvCreate,
  onMessageCreate,
  onUserDelete,
} from "./hooks";
import { env } from "./env";
import { handleClerkWebhook } from "./webhooks/clerk";
import { inputs } from "./inputs";

type Vars = { session: Awaited<ReturnType<typeof loadSession>> };

export const app = new Hono<{ Variables: Vars }>().basePath("/api");

// --- session middleware ---
app.use("*", async (c, next) => {
  const session = await loadSession(c);
  c.set("session", session);
  await next();
});

// --- error handler ---
app.onError((err, c) => {
  if (err instanceof HttpError) return c.json(err.toJSON(), err.status as 400);
  console.error("Unhandled", err);
  return c.json(
    { error: { code: "internal", message: "Something went wrong" } },
    500
  );
});

// --- CSRF-lite: reject cross-origin write attempts ---
app.use("*", async (c, next) => {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }
  const origin = c.req.header("Origin");
  const host = c.req.header("Host");
  if (origin && host) {
    const u = new URL(origin);
    if (u.host !== host) {
      // Same-site only.
      return c.json({ error: { code: "cross_origin", message: "Cross-origin denied" } }, 403);
    }
  }
  return next();
});

// --- /api/auth/me ---
app.get("/auth/me", (c) => {
  const s = c.get("session");
  if (!s) return c.json(null);
  return c.json({
    id: s.userId,
    email: s.email,
    full_name: s.fullName,
    role: s.role,
  });
});

// --- Clerk webhook (Svix-verified) ---
app.post("/webhooks/clerk", (c) => handleClerkWebhook(c));

// Utility: get the Drizzle table columns as an object indexable by column
// name (snake_case, matches the entity schema).
function tableForEntity(entity: EntityName) {
  const p = policies[entity];
  const t = schema[p.table] as unknown as Record<string, PgColumn> & {
    // Drizzle table has extra symbols but the column keys sit alongside them.
  };
  return t;
}

// --- Generic entity endpoints ---
app.get("/entities/:entity", async (c) => {
  const entity = entityByName(c.req.param("entity"));
  const p = policies[entity];
  const session = c.get("session");
  if (!p.anonymousRead && !session) throw badRequest("Sign-in required to list this entity");
  const q = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const table = tableForEntity(entity);
  const filters = parseFilters(q, p, table);
  const orderBy = parseSort(q.sort, p, table);
  const limit = parseLimit(q.limit);

  const rows = await db()
    .select()
    .from(schema[p.table] as never)
    .where(filters as SQL | undefined)
    .orderBy(orderBy!)
    .limit(limit);

  // Row-level filter: canRead
  const visible = (rows as Record<string, unknown>[]).filter((r) => p.canRead(r, session));
  return c.json(visible.map(toRecord));
});

app.get("/entities/:entity/:id", async (c) => {
  const entity = entityByName(c.req.param("entity"));
  const p = policies[entity];
  const id = c.req.param("id");
  const table = tableForEntity(entity);
  const [row] = await db()
    .select()
    .from(schema[p.table] as never)
    .where(eq(table.id, id))
    .limit(1);
  if (!row) throw notFound();
  const session = c.get("session");
  if (!p.canRead(row as Record<string, unknown>, session)) throw notFound();
  return c.json(toRecord(row as Record<string, unknown>));
});

app.post("/entities/:entity", async (c) => {
  const entity = entityByName(c.req.param("entity"));
  const p = policies[entity];
  const session = requireSession(c.get("session"));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!p.canCreate(body, session))
    throw new HttpError(403, "forbidden", "Cannot create");

  const createSchema = inputs[entity]?.create;
  if (createSchema) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, "invalid_input", parsed.error.issues[0].message, {
        issues: parsed.error.issues,
      });
    }
  }

  const clean = scrub(entity, body, session, "create");

  // Route through the hook layer where hooks exist; otherwise plain insert.
  let row: Record<string, unknown>;
  switch (entity) {
    case "Comment":
      row = (await onCommentCreate(
        clean as typeof schema.comments.$inferInsert
      )) as unknown as Record<string, unknown>;
      break;
    case "Follow":
      row = (await onFollowCreate(
        clean as typeof schema.follows.$inferInsert,
        session
      )) as unknown as Record<string, unknown>;
      break;
    case "Bookmark":
      row = (await onBookmarkCreate(
        clean as typeof schema.bookmarks.$inferInsert
      )) as unknown as Record<string, unknown>;
      break;
    case "Conv":
      row = (await onConvCreate(
        clean as typeof schema.convs.$inferInsert
      )) as unknown as Record<string, unknown>;
      break;
    case "Reconv":
      row = (await onReconvCreate(
        clean as typeof schema.reconvs.$inferInsert
      )) as unknown as Record<string, unknown>;
      break;
    case "Message":
      row = (await onMessageCreate(
        clean as typeof schema.messages.$inferInsert
      )) as unknown as Record<string, unknown>;
      break;
    case "Notification":
      throw new HttpError(
        403,
        "forbidden",
        "Notifications are created by the server only"
      );
    default: {
      const [r] = await db()
        .insert(schema[p.table] as never)
        .values(clean as never)
        .returning();
      row = r as Record<string, unknown>;
    }
  }

  return c.json(toRecord(row), 201);
});

app.patch("/entities/:entity/:id", async (c) => {
  const entity = entityByName(c.req.param("entity"));
  const p = policies[entity];
  const id = c.req.param("id");
  const session = requireSession(c.get("session"));
  const table = tableForEntity(entity);
  const [existing] = await db()
    .select()
    .from(schema[p.table] as never)
    .where(eq(table.id, id))
    .limit(1);
  if (!existing) throw notFound();
  if (!p.canUpdate(existing as Record<string, unknown>, session))
    throw new HttpError(403, "forbidden", "Cannot update");

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const updateSchema = inputs[entity]?.update;
  if (updateSchema) {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, "invalid_input", parsed.error.issues[0].message, {
        issues: parsed.error.issues,
      });
    }
  }
  const clean = scrub(entity, body, session, "update");
  // Role changes on User are admin-only. Silently strip for non-admins so a
  // user editing their own theme can't smuggle a role bump into the same body.
  if (entity === "User" && session.role !== "admin" && "role" in clean) {
    delete clean.role;
  }
  const [row] = await db()
    .update(schema[p.table] as never)
    .set(clean as never)
    .where(eq(table.id, id))
    .returning();
  return c.json(toRecord(row as Record<string, unknown>));
});

app.delete("/entities/:entity/:id", async (c) => {
  const entity = entityByName(c.req.param("entity"));
  const p = policies[entity];
  const id = c.req.param("id");
  const session = requireSession(c.get("session"));
  const table = tableForEntity(entity);
  const [existing] = await db()
    .select()
    .from(schema[p.table] as never)
    .where(eq(table.id, id))
    .limit(1);
  if (!existing) throw notFound();
  if (!p.canDelete(existing as Record<string, unknown>, session))
    throw new HttpError(403, "forbidden", "Cannot delete");

  switch (entity) {
    case "Conv":
      await onConvDelete(id);
      break;
    case "Comment":
      await onCommentDelete(id);
      break;
    case "Follow":
      await onFollowDelete(id);
      break;
    case "Bookmark":
      await onBookmarkDelete(id);
      break;
    case "User":
      await onUserDelete(id);
      break;
    default:
      await db()
        .delete(schema[p.table] as never)
        .where(eq(table.id, id));
  }
  return c.body(null, 204);
});

// --- Cron: moderation retry (queued rows) ---
app.post("/cron/moderation-retry", async (c) => {
  const secret =
    c.req.header("X-Cron-Secret") ??
    c.req.query("secret") ??
    // Vercel Cron passes the secret in Authorization: Bearer <CRON_SECRET>.
    c.req.header("Authorization")?.replace(/^Bearer\s+/, "");
  if (!secret || secret !== env().CRON_SECRET) {
    throw new HttpError(403, "forbidden", "Bad cron secret");
  }
  const { drainModerationQueue } = await import("./moderation");
  const result = await drainModerationQueue(20);
  return c.json({ ok: true, ...result });
});

// --- Uploads ---
app.post("/upload", async (c) => {
  const { handleUpload } = await import("./upload");
  return handleUpload(c);
});

// Catch-all for unknown routes under /api
app.notFound((c) => c.json({ error: { code: "not_found", message: "No such route" } }, 404));
