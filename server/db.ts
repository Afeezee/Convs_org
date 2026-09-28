import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { env } from "./env";

// Drizzle's `neon-http` driver does not support interactive transactions, so
// we use the serverless Pool + `drizzle-orm/neon-serverless` for everything
// (hooks, cascades, moderation writes). Reads share the same pool: the extra
// round trip vs neon-http is negligible in fra1 → eu-central-1.

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: env().DATABASE_URL });
  }
  return pool;
}

export function db() {
  return drizzle(getPool(), { schema });
}

export type Db = ReturnType<typeof db>;
export { schema };
