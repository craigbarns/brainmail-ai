import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
export type Row = Record<string, any>; // Database rows are validated at each external boundary.
export interface DB {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
type Store = {
  db: DB;
  transaction: <T>(fn: (db: DB) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
};
const globalDB = globalThis as typeof globalThis & { brainDB?: Promise<Store> };
export async function database(): Promise<Store> {
  return (globalDB.brainDB ??= (async () => {
    if (process.env.DATABASE_URL) {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
      return {
        db: pool,
        transaction: async <T>(fn: (db: DB) => Promise<T>) => {
          const c = await pool.connect();
          try {
            await c.query('BEGIN');
            const v = await fn(c);
            await c.query('COMMIT');
            return v;
          } catch (e) {
            await c.query('ROLLBACK');
            throw e;
          } finally {
            c.release();
          }
        },
        close: () => pool.end(),
      };
    }
    if (process.env.NODE_ENV === 'production' || process.env.LOCAL_DEV !== 'true')
      throw new Error('DATABASE_URL manquant. LOCAL_DEV=true est réservé au développement.');
    const dir = process.env.LOCAL_DB_PATH || '.data/postgres';
    if (dir !== ':memory:') await mkdir(dir, { recursive: true });
    const pg = new PGlite(dir === ':memory:' ? undefined : dir);
    await pg.waitReady;
    return {
      db: pg,
      transaction: <T>(fn: (db: DB) => Promise<T>) => pg.transaction(fn),
      close: () => pg.close(),
    };
  })());
}
export async function query<T extends Row = Row>(sql: string, params: unknown[] = []) {
  return (await (await database()).db.query<T>(sql, params)).rows;
}
export async function transaction<T>(fn: (db: DB) => Promise<T>) {
  return (await database()).transaction(fn);
}
export async function migrate() {
  const directory = path.join(process.cwd(), 'db');
  const names = (await readdir(directory)).filter((n) => /^\d+_.+\.sql$/.test(n)).sort();
  await transaction(async (db) => {
    if (process.env.DATABASE_URL) await db.query('SELECT pg_advisory_xact_lock(728491)');
    await db.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const name of names) {
      const sql = await readFile(path.join(directory, name), 'utf8'),
        checksum = createHash('sha256').update(sql).digest('hex');
      const {
        rows: [prior],
      } = await db.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name]);
      if (prior) {
        if (prior.checksum !== checksum)
          throw new Error(`Migration modifiée après application : ${name}`);
        continue;
      }
      // Initial migrations contain plain SQL statements, no procedural bodies.
      for (const statement of sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean))
        await db.query(statement);
      await db.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [
        name,
        checksum,
      ]);
    }
  });
}
