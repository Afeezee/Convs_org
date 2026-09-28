// POST /api/upload: multipart file → Vercel Blob → { file_url }.
// Restrictions per the migration spec:
//   • image/jpeg | png | webp | gif only, no SVG
//   • 5 MB max
//   • random filenames (never trust the client's name)
//   • signed-in users only, 20 uploads / hour / user

import type { Context } from "hono";
import { put } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import { requireSession } from "./auth";
import { hitRateLimit } from "./rate-limit";
import { badRequest, unprocessable } from "./errors";
import { env } from "./env";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function handleUpload(c: Context) {
  const session = requireSession(c.get("session"));

  const gate = await hitRateLimit(`upload:${session.email}`, 20);
  if (!gate.allowed) {
    return c.json(
      { error: { code: "rate_limited", message: "Too many uploads this hour" } },
      429
    );
  }

  const form = await c.req.parseBody({ all: false });
  const file = form.file;
  if (!(file instanceof File)) throw badRequest("Expected multipart 'file' field");

  if (!ALLOWED.has(file.type)) {
    throw unprocessable(
      "invalid_type",
      `Only jpeg/png/webp/gif images are allowed (got ${file.type})`
    );
  }
  if (file.size > MAX_BYTES) {
    throw unprocessable("too_large", `Max upload size is ${MAX_BYTES / (1024 * 1024)} MB`);
  }

  const ext = EXT[file.type] ?? "bin";
  const name = `${randomBytes(16).toString("hex")}.${ext}`;

  const token = env().BLOB_READ_WRITE_TOKEN;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const blob = await put(`uploads/${name}`, bytes, {
    access: "public",
    contentType: file.type,
    token,
  });

  return c.json({ file_url: blob.url });
}
