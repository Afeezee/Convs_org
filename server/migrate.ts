// Applies Drizzle migrations against the unpooled connection. Run with
// `npm run db:migrate`. Idempotent — Drizzle skips migrations already applied.
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL[_UNPOOLED] not set");
  const pool = new Pool({ connectionString: url });
  const database = drizzle(pool);
  await migrate(database, { migrationsFolder: "./drizzle" });
  await pool.end();
  // eslint-disable-next-line no-console
  console.log("Migrations applied.");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
