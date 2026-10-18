import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema.js";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Database = { db: DB; close: () => Promise<void> };

const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../drizzle");

/**
 * Real Postgres when DATABASE_URL is set (Render), otherwise embedded PGlite
 * (a full Postgres build in WASM) on disk, or in memory when dir is "memory".
 * Both run the same SQL migrations.
 */
export async function openDatabase(opts: { databaseUrl?: string; pgliteDir: string }): Promise<Database> {
  if (opts.databaseUrl) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const local = /localhost|127\.0\.0\.1/.test(opts.databaseUrl);
    const pool = new Pool({ connectionString: opts.databaseUrl, ssl: local ? false : { rejectUnauthorized: false }, max: 10 });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS });
    return { db: db as unknown as DB, close: () => pool.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = opts.pgliteDir === "memory" ? new PGlite() : new PGlite(opts.pgliteDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return { db: db as unknown as DB, close: () => client.close() };
}
