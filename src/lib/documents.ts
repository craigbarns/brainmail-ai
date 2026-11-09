import { randomUUID } from 'node:crypto';
import { query, transaction, type DB, type Row } from './db';
import { hash, secret, HttpError } from './security';
import { putFile, deleteFile, validateFile } from './storage';
export async function enqueue(
  db: DB,
  workspaceId: string,
  kind: string,
  payload: unknown,
  key: string,
) {
  await db.query(
    'INSERT INTO jobs(id,workspace_id,kind,payload,dedup_key) VALUES($1,$2,$3,$4,$5) ON CONFLICT(dedup_key) DO NOTHING',
    [randomUUID(), workspaceId, kind, JSON.stringify(payload), key],
  );
}
export async function createDocument(
  workspaceId: string,
  source: 'scan' | 'pdf' | 'email',
  title = 'Nouveau courrier',
) {
  const id = randomUUID();
  await query('INSERT INTO documents(id,workspace_id,source,title) VALUES($1,$2,$3,$4)', [
    id,
    workspaceId,
    source,
    title,
  ]);
  return id;
}
export async function createScan(workspaceId: string) {
  return transaction(async (db) => {
    const id = randomUUID(),
      documentId = randomUUID(),
      token = secret();
    await db.query("INSERT INTO documents(id,workspace_id,source) VALUES($1,$2,'scan')", [
      documentId,
      workspaceId,
    ]);
    const { rows } = await db.query(
      "INSERT INTO scans(id,workspace_id,document_id,token_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '15 minutes') RETURNING expires_at",
      [id, workspaceId, documentId, hash(token)],
    );
    return { id, documentId, token, expiresAt: rows[0].expires_at };
  });
}
export async function pairScan(token: string) {
  const device = secret();
  const [scan] = await query(
    'UPDATE scans SET device_hash=$1 WHERE token_hash=$2 AND device_hash IS NULL AND expires_at>now() AND completed_at IS NULL RETURNING id,document_id,expires_at',
    [hash(device), hash(token)],
  );
  if (!scan)
    throw new HttpError(
      410,
      'QR code expiré ou déjà utilisé. Créez-en un nouveau sur votre ordinateur.',
    );
  return { scan, device };
}
export async function mobileScan(device: string) {
  const [scan] = await query(
    'SELECT * FROM scans WHERE device_hash=$1 AND expires_at>now() AND completed_at IS NULL',
    [hash(device)],
  );
  if (!scan) throw new HttpError(410, 'Session de capture terminée ou expirée.');
  return scan;
}
export async function appendFile(
  workspaceId: string,
  documentId: string,
  bytes: Buffer,
  scanId?: string,
) {
  const valid = await validateFile(bytes);
  const fileId = randomUUID();
  const key = `${workspaceId}/${documentId}/${fileId}`;
  // Encrypt and upload first; compensate on any database rejection.
  await putFile(key, valid.bytes);
  try {
    return await transaction(async (db) => {
      const {
        rows: [doc],
      } = await db.query(
        'SELECT status FROM documents WHERE id=$1 AND workspace_id=$2 FOR UPDATE',
        [documentId, workspaceId],
      );
      if (!doc) throw new HttpError(404, 'Courrier introuvable.');
      if (doc.status !== 'capturing')
        throw new HttpError(409, 'Ce courrier est déjà en cours de traitement.');
      if (scanId) {
        const {
          rows: [scan],
        } = await db.query(
          'SELECT id FROM scans WHERE id=$1 AND workspace_id=$2 AND expires_at>now() AND completed_at IS NULL FOR UPDATE',
          [scanId, workspaceId],
        );
        if (!scan) throw new HttpError(410, 'Session expirée.');
      }
      const {
        rows: [count],
      } = await db.query(
        'SELECT count(*)::int AS n,coalesce(sum(size),0)::bigint AS bytes FROM document_files WHERE document_id=$1 AND workspace_id=$2',
        [documentId, workspaceId],
      );
      if (count.n >= 20 || Number(count.bytes) + valid.bytes.length > 50 * 1024 * 1024)
        throw new HttpError(413, 'Maximum : 20 fichiers ou 50 Mo par courrier.');
      await db.query(
        'INSERT INTO document_files(id,document_id,workspace_id,storage_key,mime,size,ordinal) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [fileId, documentId, workspaceId, key, valid.mime, valid.bytes.length, count.n + 1],
      );
      return { id: fileId, ordinal: count.n + 1, mime: valid.mime };
    });
  } catch (e) {
    await deleteFile(key);
    throw e;
  }
}
export async function finalizeDocument(workspaceId: string, documentId: string, scanId?: string) {
  await transaction(async (db) => {
    const {
      rows: [doc],
    } = await db.query('SELECT status FROM documents WHERE id=$1 AND workspace_id=$2 FOR UPDATE', [
      documentId,
      workspaceId,
    ]);
    if (!doc) throw new HttpError(404, 'Courrier introuvable.');
    if (doc.status !== 'capturing') return;
    if (scanId) {
      const {
        rows: [scan],
      } = await db.query(
        'SELECT id FROM scans WHERE id=$1 AND workspace_id=$2 AND expires_at>now() AND completed_at IS NULL FOR UPDATE',
        [scanId, workspaceId],
      );
      if (!scan) throw new HttpError(410, 'Session expirée.');
    }
    if (
      !(
        await db.query(
          'SELECT id FROM document_files WHERE document_id=$1 AND workspace_id=$2 LIMIT 1',
          [documentId, workspaceId],
        )
      ).rows.length
    )
      throw new HttpError(400, 'Ajoutez au moins une page.');
    await db.query(
      "UPDATE documents SET status='queued',updated_at=now() WHERE id=$1 AND workspace_id=$2",
      [documentId, workspaceId],
    );
    await db.query('UPDATE scans SET completed_at=now() WHERE document_id=$1 AND workspace_id=$2', [
      documentId,
      workspaceId,
    ]);
    await enqueue(db, workspaceId, 'analyze', { documentId }, `analyze:${documentId}`);
  });
}
export async function documentDetail(
  workspaceId: string,
  id: string,
): Promise<Row & { files: Row[]; actions: Row[] }> {
  const [document] = await query('SELECT * FROM documents WHERE id=$1 AND workspace_id=$2', [
    id,
    workspaceId,
  ]);
  if (!document) throw new HttpError(404, 'Courrier introuvable.');
  const files = await query(
    'SELECT id,mime,size,ordinal FROM document_files WHERE document_id=$1 AND workspace_id=$2 ORDER BY ordinal',
    [id, workspaceId],
  );
  const actions = await query(
    "SELECT *,to_char(due_date,'YYYY-MM-DD') AS due_date FROM actions WHERE document_id=$1 AND workspace_id=$2 ORDER BY actions.due_date NULLS LAST",
    [id, workspaceId],
  );
  return { ...document, files, actions };
}
