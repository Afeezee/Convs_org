// Query helpers for the generic entity endpoints. Understands the small
// dialect the client uses: `sort` like "-created_date" and equality-only
// `filter` params. Everything runs through allow-lists from `policies.ts`.

import { and, asc, desc, eq, SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { policies, EntityName, EntityPolicy } from "./policies.js";
import { badRequest } from "./errors.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw badRequest("limit must be positive");
  return Math.min(Math.floor(n), MAX_LIMIT);
}

export function parseSort(
  raw: string | undefined,
  policy: EntityPolicy,
  table: Record<string, PgColumn>
): SQL | undefined {
  if (!raw) {
    // Default sort: newest first, if the entity has created_date.
    return desc(table.created_date);
  }
  const desc_ = raw.startsWith("-");
  const key = desc_ ? raw.slice(1) : raw;
  if (!policy.sortable.includes(key)) {
    throw badRequest(`sort '${key}' not allowed for this entity`);
  }
  const col = table[key];
  if (!col) throw badRequest(`unknown sort column '${key}'`);
  return desc_ ? desc(col) : asc(col);
}

export function parseFilters(
  query: Record<string, string | undefined>,
  policy: EntityPolicy,
  table: Record<string, PgColumn>
): SQL | undefined {
  const clauses: SQL[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    // Reserved query keys
    if (k === "sort" || k === "limit" || k === "cursor") continue;
    if (!policy.filterable.includes(k)) {
      throw badRequest(`filter '${k}' not allowed for this entity`);
    }
    const col = table[k];
    if (!col) throw badRequest(`unknown column '${k}'`);
    // Booleans/numbers: caller sends "true"/"false"/"123"; keep it simple —
    // Drizzle handles the coercion where the column type is known.
    clauses.push(eq(col, coerceScalar(v)));
  }
  return clauses.length ? and(...clauses) : undefined;
}

function coerceScalar(v: string): string | number | boolean {
  if (v === "true") return true;
  if (v === "false") return false;
  if (v !== "" && !Number.isNaN(Number(v)) && String(Number(v)) === v) {
    return Number(v);
  }
  return v;
}

/** Wire-shaped record — snake_case columns, ISO date strings. */
export function toRecord(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
  }
  return out;
}

export function entityByName(name: string): EntityName {
  if (!(name in policies)) throw badRequest(`unknown entity '${name}'`);
  return name as EntityName;
}
