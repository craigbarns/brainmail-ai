import { randomUUID } from 'node:crypto';
import { query, transaction, type DB, type Row } from './db';
import { hash, secret, HttpError } from './security';
import { putFile, deleteFile, validateFile } from './storage';
import { recordMilestone } from './conversion';
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
export async function createScan(workspaceId: string, initiatedByUserId?: string) {
  return transaction(async (db) => {
    const id = randomUUID(),
      documentId = randomUUID(),
      token = secret();
    await db.query("INSERT INTO documents(id,workspace_id,source) VALUES($1,$2,'scan')", [
      documentId,
      workspaceId,
    ]);
    const { rows } = await db.query(
      "INSERT INTO scans(id,workspace_id,document_id,token_hash,expires_at,initiated_by_user_id) VALUES($1,$2,$3,$4,now()+interval '15 minutes',$5) RETURNING expires_at",
      [id, workspaceId, documentId, hash(token), initiatedByUserId ?? null],
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
    let initiatorId: string | null = null;
    if (scanId) {
      const {
        rows: [scan],
      } = await db.query(
        'SELECT id,initiated_by_user_id FROM scans WHERE id=$1 AND workspace_id=$2 AND expires_at>now() AND completed_at IS NULL FOR UPDATE',
        [scanId, workspaceId],
      );
      if (!scan) throw new HttpError(410, 'Session expirée.');
      initiatorId = scan.initiated_by_user_id ?? null;
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
    if (initiatorId) await recordMilestone(db, initiatorId, 'first_scan');
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
  const [dossier] = await query(
    'SELECT d.id,d.label,d.status FROM dossiers d JOIN documents doc ON doc.dossier_id=d.id WHERE doc.id=$1 AND doc.workspace_id=$2',
    [id, workspaceId],
  );
  return { ...document, files, actions, dossier: dossier ?? null };
}
// Permanent deletion of a document and its files, including abandoned
// captures: no orphan rows or encrypted objects may survive (RGPD erasure).
// The storage objects are removed BEFORE the rows: a failed removal aborts the
// transaction, so a reference never outlives its encrypted object (S3 deletes
// are idempotent, so a retry cannot fail on an already-removed key).
export async function deleteDocument(
  workspaceId: string,
  documentId: string,
  { onlyCapturing = false } = {},
) {
  const keys = await transaction(async (db) => {
    // Lock the document first: a concurrent upload or finalization waits, so the
    // file list below is complete and the status check cannot go stale.
    const {
      rows: [doc],
    } = await db.query('SELECT status FROM documents WHERE id=$1 AND workspace_id=$2 FOR UPDATE', [
      documentId,
      workspaceId,
    ]);
    if (!doc) throw new HttpError(404, 'Courrier introuvable.');
    if (onlyCapturing && doc.status !== 'capturing')
      throw new HttpError(
        409,
        'Ce courrier a déjà été envoyé pour analyse. Supprimez-le depuis sa fiche si besoin.',
      );
    const { rows: files } = await db.query(
      'SELECT storage_key FROM document_files WHERE document_id=$1 AND workspace_id=$2',
      [documentId, workspaceId],
    );
    return files.map((f) => f.storage_key as string);
  });
  const removed = await Promise.allSettled(keys.map((key) => deleteFile(key)));
  if (removed.some((r) => r.status === 'rejected'))
    throw new HttpError(503, 'Suppression du stockage momentanément indisponible. Réessayez.');
  await transaction(async (db) => {
    await db.query('DELETE FROM document_files WHERE document_id=$1 AND workspace_id=$2', [
      documentId,
      workspaceId,
    ]);
    await db.query('DELETE FROM documents WHERE id=$1 AND workspace_id=$2', [
      documentId,
      workspaceId,
    ]);
    // Dropping the lease token stops a worker mid-analysis from re-queuing the job.
    await db.query(
      "UPDATE jobs SET state='failed',last_error='Courrier supprimé.',lease_until=NULL,lease_token=NULL WHERE workspace_id=$1 AND dedup_key=$2 AND state IN ('queued','running')",
      [workspaceId, `analyze:${documentId}`],
    );
  });
}
