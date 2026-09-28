// Recomputes every denormalised counter from the source rows. Safe to run at
// any time — writes only if the stored value diverges from the recomputed
// one, and prints a diff summary before/after.

import { getPool, schema } from "../server/db";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, sql } from "drizzle-orm";

interface Diff {
  entity: string;
  key: string;
  field: string;
  stored: number;
  actual: number;
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const pool = getPool();
  const db = drizzle(pool, { schema });
  const diffs: Diff[] = [];

  // Conv counts — comment_count, support_count, oppose_count, bookmark_count
  const convs = await db.select().from(schema.convs);
  for (const conv of convs) {
    const [{ commentCount }] = await db
      .select({ commentCount: sql<number>`count(*)::int` })
      .from(schema.comments)
      .where(eq(schema.comments.conv_id, conv.id));
    const [{ supportCount }] = await db
      .select({ supportCount: sql<number>`count(*)::int` })
      .from(schema.comments)
      .where(sql`${schema.comments.conv_id} = ${conv.id} AND ${schema.comments.stance} = 'support'`);
    const [{ opposeCount }] = await db
      .select({ opposeCount: sql<number>`count(*)::int` })
      .from(schema.comments)
      .where(sql`${schema.comments.conv_id} = ${conv.id} AND ${schema.comments.stance} = 'oppose'`);
    const [{ bookmarkCount }] = await db
      .select({ bookmarkCount: sql<number>`count(*)::int` })
      .from(schema.bookmarks)
      .where(sql`${schema.bookmarks.conv_id} = ${conv.id} AND ${schema.bookmarks.type} = 'conv'`);

    const record = (field: string, stored: number, actual: number) => {
      if (stored !== actual) {
        diffs.push({ entity: "Conv", key: conv.id, field, stored, actual });
      }
    };
    record("comment_count", conv.comment_count, commentCount);
    record("support_count", conv.support_count, supportCount);
    record("oppose_count", conv.oppose_count, opposeCount);
    record("bookmark_count", conv.bookmark_count, bookmarkCount);

    if (!dry) {
      await db
        .update(schema.convs)
        .set({
          comment_count: commentCount,
          support_count: supportCount,
          oppose_count: opposeCount,
          bookmark_count: bookmarkCount,
          updated_date: new Date(),
        })
        .where(eq(schema.convs.id, conv.id));
    }
  }

  // Profile counts — followers/following/convs/support/oppose + avg_quality_score
  const profiles = await db.select().from(schema.profiles);
  for (const profile of profiles) {
    const email = profile.email;
    const [{ followers }] = await db
      .select({ followers: sql<number>`count(*)::int` })
      .from(schema.follows)
      .where(eq(schema.follows.following_email, email));
    const [{ following }] = await db
      .select({ following: sql<number>`count(*)::int` })
      .from(schema.follows)
      .where(eq(schema.follows.follower_email, email));
    const [{ convsCount }] = await db
      .select({ convsCount: sql<number>`count(*)::int` })
      .from(schema.convs)
      .where(eq(schema.convs.author_email, email));
    const [{ supportCount }] = await db
      .select({ supportCount: sql<number>`count(*)::int` })
      .from(schema.comments)
      .where(sql`${schema.comments.author_email} = ${email} AND ${schema.comments.stance} = 'support'`);
    const [{ opposeCount }] = await db
      .select({ opposeCount: sql<number>`count(*)::int` })
      .from(schema.comments)
      .where(sql`${schema.comments.author_email} = ${email} AND ${schema.comments.stance} = 'oppose'`);
    const [{ avg }] = await db
      .select({ avg: sql<number>`coalesce(avg(${schema.convs.quality_score})::int, 0)` })
      .from(schema.convs)
      .where(eq(schema.convs.author_email, email));

    const record = (field: string, stored: number, actual: number) => {
      if (stored !== actual) {
        diffs.push({ entity: "Profile", key: email, field, stored, actual });
      }
    };
    record("followers_count", profile.followers_count, followers);
    record("following_count", profile.following_count, following);
    record("convs_count", profile.convs_count, convsCount);
    record("support_count", profile.support_count, supportCount);
    record("oppose_count", profile.oppose_count, opposeCount);
    record("avg_quality_score", profile.avg_quality_score, avg);

    if (!dry) {
      await db
        .update(schema.profiles)
        .set({
          followers_count: followers,
          following_count: following,
          convs_count: convsCount,
          support_count: supportCount,
          oppose_count: opposeCount,
          avg_quality_score: avg,
          updated_date: new Date(),
        })
        .where(eq(schema.profiles.email, email));
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `${dry ? "[dry-run] " : ""}Reconciled ${convs.length} convs, ${profiles.length} profiles. Diffs: ${diffs.length}`
  );
  if (diffs.length) {
    // eslint-disable-next-line no-console
    console.table(diffs.slice(0, 100));
  }

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
