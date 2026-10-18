import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema.js";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Database = { db: DB; close: () => Promise<void> };

const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../drizzle");

/** Authenticate remote database servers; local development can use plaintext. */
export function postgresOptions(connectionString: string, ssl = true) {
  const url = new URL(connectionString);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  // Do not let URL SSL flags silently override certificate verification in pg.
  for (const key of ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
  return { connectionString: url.toString(), ssl: local || !ssl ? false as const : { rejectUnauthorized: true },
    max: 5, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 };
}

/**
 * Real Postgres when DATABASE_URL is set (Render), otherwise embedded PGlite
 * (a full Postgres build in WASM) on disk, or in memory when dir is "memory".
 * Both run the same SQL migrations.
 */
export async function openDatabase(opts: { databaseUrl?: string; databaseSsl?: boolean; pgliteDir: string }): Promise<Database> {
  if (opts.databaseUrl) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool(postgresOptions(opts.databaseUrl, opts.databaseSsl));
    pool.on("error", () => console.error("Idle PostgreSQL connection failed"));
    const db = drizzle(pool, { schema });
    try { await migrate(db, { migrationsFolder: MIGRATIONS }); } catch (err) { await pool.end(); throw err; }
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
