// Downloads media hosted on LEGACY_MEDIA_HOST and re-uploads it to Vercel
// Blob, rewriting the URLs on Conv (media_url), Profile (profile_image,
// cover_image) and Message (media_url). Runs manually — old URLs keep
// working until this script has processed them, so nothing breaks in the
// meantime.
//
// The legacy host is read from LEGACY_MEDIA_HOST so nothing in this script
// hard-codes a reference to the old platform.

import { getPool, schema } from "../server/db";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import { env } from "../server/env";

interface Options {
  dryRun: boolean;
}

function parseArgs(): Options {
  return { dryRun: process.argv.includes("--dry-run") };
}

const opt = parseArgs();

async function download(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extFor(contentType: string): string {
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("quicktime")) return "mov";
  return "bin";
}

async function rehost(url: string): Promise<string | null> {
  const dl = await download(url);
  if (!dl) return null;
  const name = `${randomBytes(16).toString("hex")}.${extFor(dl.contentType)}`;
  const blob = await put(`uploads/${name}`, dl.bytes, {
    access: "public",
    contentType: dl.contentType,
    token: env().BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

async function main() {
  const legacyHost = env().LEGACY_MEDIA_HOST;
  if (!legacyHost) {
    // eslint-disable-next-line no-console
    console.log("LEGACY_MEDIA_HOST not set; nothing to rehost.");
    process.exit(0);
  }
  // eslint-disable-next-line no-console
  console.log(`[rehost] legacy_host=${legacyHost} dry=${opt.dryRun}`);

  const pool = getPool();
  const db = drizzle(pool, { schema });
  const containsLegacy = (u: string | null): boolean =>
    !!u && u.includes(legacyHost);

  let processed = 0;
  let rewritten = 0;
  let failed = 0;

  // -- Convs.media_url --
  const convs = await db.select().from(schema.convs);
  for (const c of convs) {
    if (!containsLegacy(c.media_url)) continue;
    processed++;
    if (opt.dryRun) continue;
    const newUrl = await rehost(c.media_url as string);
    if (!newUrl) { failed++; continue; }
    await db.update(schema.convs).set({ media_url: newUrl, updated_date: new Date() }).where(eq(schema.convs.id, c.id));
    rewritten++;
  }

  // -- Profiles.profile_image + cover_image --
  const profiles = await db.select().from(schema.profiles);
  for (const p of profiles) {
    const patch: Record<string, string> = {};
    if (containsLegacy(p.profile_image)) {
      processed++;
      if (!opt.dryRun) {
        const u = await rehost(p.profile_image as string);
        if (u) { patch.profile_image = u; rewritten++; } else failed++;
      }
    }
    if (containsLegacy(p.cover_image)) {
      processed++;
      if (!opt.dryRun) {
        const u = await rehost(p.cover_image as string);
        if (u) { patch.cover_image = u; rewritten++; } else failed++;
      }
    }
    if (Object.keys(patch).length) {
      await db.update(schema.profiles).set({ ...patch, updated_date: new Date() }).where(eq(schema.profiles.email, p.email));
    }
  }

  // -- Messages.media_url --
  const msgs = await db.select().from(schema.messages);
  for (const m of msgs) {
    if (!containsLegacy(m.media_url)) continue;
    processed++;
    if (opt.dryRun) continue;
    const u = await rehost(m.media_url as string);
    if (!u) { failed++; continue; }
    await db.update(schema.messages).set({ media_url: u }).where(eq(schema.messages.id, m.id));
    rewritten++;
  }

  // eslint-disable-next-line no-console
  console.log(`[rehost] processed=${processed} rewritten=${rewritten} failed=${failed}`);
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
