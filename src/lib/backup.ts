import { gzipSync, gunzipSync } from 'node:zlib';
import { query, transaction } from './db';
import { encrypt, decrypt } from './security';
import { putBackup, getBackup, listBackups, deleteBackup } from './storage';

// Daily logical backup of the database, for hosting plans without volume
// snapshots. The export is gzipped, encrypted with the storage key and kept in
// the private bucket next to the mail files. Short-lived tables are left out:
// sessions, tokens, counters and pairing codes are worthless after a restore.
const EPHEMERAL = new Set([
  'sessions',
  'verification_tokens',
  'password_resets',
  'rate_limits',
  'scans',
  'schema_migrations',
]);
const RETENTION_DAYS = 30;
const CONTEXT = 'brainmail-backup-v1';
const safeName = (name: string) => /^[a-z_][a-z0-9_]*$/.test(name);
const paris = (date: Date) =>
  new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(date);
export const backupName = (date = new Date()) => `db-${paris(date)}.bin`;

async function tables() {
  const rows = await query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name",
  );
  return rows.map((r) => r.table_name).filter((t) => safeName(t) && !EPHEMERAL.has(t));
}
// Parents before children, so every foreign key finds its row at restore time.
async function restoreOrder(names: string[]) {
  const links = await query<{ child: string; parent: string }>(
    "SELECT c.conrelid::regclass::text AS child,c.confrelid::regclass::text AS parent FROM pg_constraint c WHERE c.contype='f'",
  );
  const pending = new Set(names);
  const ordered: string[] = [];
  while (pending.size) {
    const ready = [...pending].filter(
      (t) => !links.some((l) => l.child === t && l.parent !== t && pending.has(l.parent)),
    );
    if (!ready.length) throw new Error('Dépendances circulaires entre tables.');
    for (const t of ready.sort()) {
      ordered.push(t);
      pending.delete(t);
    }
  }
  return ordered;
}
export async function exportDatabase() {
  const data: Record<string, unknown[]> = {};
  // Listed before the transaction opens: the embedded test database serves one
  // connection, and a query outside the open transaction would wait forever.
  const names = await tables();
  // One transaction: every table is read from the same snapshot.
  await transaction(async (db) => {
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    for (const table of names) {
      const {
        rows: [r],
      } = await db.query(`SELECT coalesce(json_agg(t),'[]'::json) AS rows FROM "${table}" t`);
      data[table] = typeof r.rows === 'string' ? JSON.parse(r.rows) : r.rows;
    }
  });
  const payload = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), tables: data });
  return encrypt(gzipSync(Buffer.from(payload)), CONTEXT);
}
// Restores into a freshly migrated, empty database. It never overwrites: a
// database that already holds accounts is refused.
export async function restoreDatabase(bytes: Buffer) {
  const backup = JSON.parse(gunzipSync(decrypt(bytes, CONTEXT)).toString()) as {
    version: number;
    createdAt: string;
    tables: Record<string, unknown[]>;
  };
  if (backup.version !== 1) throw new Error('Version de sauvegarde inconnue.');
  const known = new Set(await tables());
  const names = Object.keys(backup.tables).filter((t) => known.has(t));
  const order = await restoreOrder(names);
  const counts: Record<string, number> = {};
  await transaction(async (db) => {
    const { rows } = await db.query('SELECT 1 FROM users LIMIT 1');
    if (rows.length) throw new Error('Base non vide : restauration refusée.');
    for (const table of order) {
      const records = backup.tables[table];
      counts[table] = records.length;
      if (!records.length) continue;
      await db.query(
        `INSERT INTO "${table}" SELECT * FROM json_populate_recordset(null::"${table}",$1::json)`,
        [JSON.stringify(records)],
      );
    }
  });
  return { createdAt: backup.createdAt, counts };
}
export async function backupOnce(date = new Date()) {
  const name = backupName(date);
  await putBackup(name, await exportDatabase());
  const limit = backupName(new Date(date.getTime() - RETENTION_DAYS * 86_400_000));
  for (const old of await listBackups()) if (old < limit) await deleteBackup(old);
  return name;
}
// Called by the worker's hourly maintenance: one backup per Paris day.
export async function backupMaybe() {
  const name = backupName();
  if ((await listBackups()).includes(name)) return null;
  return backupOnce();
}
export async function loadBackup(name: string) {
  return getBackup(name);
}
