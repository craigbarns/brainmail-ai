import { randomUUID } from 'node:crypto';
import { query, transaction, type Row } from './db';
import { ocr, analyze, syncMemory, recallMemory } from './providers';
import { getFile } from './storage';
import { Resend } from 'resend';
import { importInbound } from './inbound';
export async function claimJob() {
  await transaction(async (db) => {
    const { rows } = await db.query(
      "UPDATE jobs SET state='failed',last_error='Nombre maximal de reprises atteint.',lease_until=NULL WHERE state='running' AND lease_until<now() AND attempts>=4 RETURNING workspace_id,kind,payload",
    );
    for (const j of rows)
      if (j.kind === 'analyze')
        await db.query(
          "UPDATE documents SET status='failed',error='Nombre maximal de reprises atteint.' WHERE id=$1 AND workspace_id=$2",
          [j.payload.documentId, j.workspace_id],
        );
  });
  const token = randomUUID();
  const [job] = await query(
    `UPDATE jobs SET state='running',attempts=attempts+1,lease_token=$1,lease_until=now()+interval '5 minutes' WHERE id=(SELECT id FROM jobs WHERE (state='queued' AND run_at<=now() OR state='running' AND lease_until<now()) AND attempts<4 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
    [token],
  );
  return job;
}
export type Providers = { ocr: typeof ocr; analyze: typeof analyze };
export async function processJob(job: Row, providers: Providers = { ocr, analyze }) {
  if (job.kind === 'memory') {
    const [workspace] = await query(
      'SELECT preferences,memory_enabled FROM workspaces WHERE id=$1',
      [job.workspace_id],
    );
    if (workspace?.memory_enabled && workspace.preferences)
      await syncMemory(job.workspace_id, workspace.preferences);
  } else if (job.kind === 'inbound') {
    await importInbound(job);
  } else {
    const [doc] = await query('SELECT * FROM documents WHERE id=$1 AND workspace_id=$2', [
      job.payload.documentId,
      job.workspace_id,
    ]);
    if (!doc) throw new Error('Courrier introuvable.');
    await transaction(async (db) => {
      const {
        rows: [lease],
      } = await db.query(
        "SELECT id FROM jobs WHERE id=$1 AND lease_token=$2 AND state='running' AND lease_until>now() FOR UPDATE",
        [job.id, job.lease_token],
      );
      if (!lease) throw new Error('Bail expiré.');
      await db.query(
        "UPDATE documents SET status='processing',error=NULL,updated_at=now() WHERE id=$1 AND workspace_id=$2",
        [doc.id, job.workspace_id],
      );
    });
    const files = await query(
      'SELECT * FROM document_files WHERE document_id=$1 AND workspace_id=$2 ORDER BY ordinal',
      [doc.id, job.workspace_id],
    );
    if (!files.length) throw new Error('Aucune page disponible.');
    let text = doc.ocr_text;
    if (!text) {
      const pages = [];
      for (const file of files) {
        const bytes = await getFile(file.storage_key);
        pages.push(
          file.mime === 'application/json'
            ? String(JSON.parse(bytes.toString()).text || '')
            : await providers.ocr(bytes, file.mime),
        );
      }
      text = pages.join('\n\n--- FICHIER ---\n\n');
    }
    if (!text.trim()) throw new Error('Aucun texte lisible. Reprenez une photo plus nette.');
    await query(
      "UPDATE documents SET ocr_text=$1 WHERE id=$2 AND workspace_id=$3 AND EXISTS(SELECT 1 FROM jobs WHERE id=$4 AND lease_token=$5 AND state='running' AND lease_until>now())",
      [text, doc.id, job.workspace_id, job.id, job.lease_token],
    );
    const [workspace] = await query(
      'SELECT preferences,memory_enabled FROM workspaces WHERE id=$1',
      [job.workspace_id],
    );
    const memory = workspace.memory_enabled
      ? await recallMemory(job.workspace_id, workspace.preferences)
      : [];
    const result = await providers.analyze(
      text,
      JSON.stringify({
        currentPreferences: workspace.preferences,
        contextualMemory: memory,
        rule: 'Les préférences actuelles de PostgreSQL prévalent.',
      }),
    );
    await transaction(async (db) => {
      const {
        rows: [lease],
      } = await db.query(
        "SELECT id FROM jobs WHERE id=$1 AND lease_token=$2 AND state='running' AND lease_until>now() FOR UPDATE",
        [job.id, job.lease_token],
      );
      if (!lease) throw new Error('Traitement repris par un autre worker.');
      await db.query(
        "UPDATE documents SET title=$1,category=$2,sender=$3,summary=$4,ocr_text=$5,draft=$6,status='ready',error=NULL,updated_at=now() WHERE id=$7 AND workspace_id=$8",
        [
          result.title,
          result.category,
          result.sender,
          result.summary,
          text,
          result.draft,
          doc.id,
          job.workspace_id,
        ],
      );
      await db.query('DELETE FROM actions WHERE document_id=$1 AND workspace_id=$2', [
        doc.id,
        job.workspace_id,
      ]);
      for (const a of result.actions)
        await db.query(
          'INSERT INTO actions(id,workspace_id,document_id,label,due_date,evidence) VALUES($1,$2,$3,$4,$5,$6)',
          [randomUUID(), job.workspace_id, doc.id, a.label, a.dueDate, a.evidence],
        );
      await db.query(
        "UPDATE jobs SET state='done',lease_until=NULL WHERE id=$1 AND lease_token=$2",
        [job.id, job.lease_token],
      );
    });
    return;
  }
  await query("UPDATE jobs SET state='done',lease_until=NULL WHERE id=$1 AND lease_token=$2", [
    job.id,
    job.lease_token,
  ]);
}
export async function workOnce(providers?: Providers) {
  const job = await claimJob();
  if (!job) return false;
  const heartbeat = setInterval(() => {
    void query(
      "UPDATE jobs SET lease_until=now()+interval '5 minutes' WHERE id=$1 AND lease_token=$2 AND state='running'",
      [job.id, job.lease_token],
    ).catch(() => {});
  }, 60000);
  try {
    await processJob(job, providers);
  } catch (error) {
    // Do not store provider bodies or document content in errors/logs.
    const message =
      error instanceof Error &&
      /non configuré|Aucun texte|Aucune page|Service externe/.test(error.message)
        ? error.message
        : 'Le traitement a échoué. Réessayez ou vérifiez la configuration.';
    const terminal = job.attempts >= 4 || message.includes('non configuré');
    await transaction(async (db) => {
      const { rows } = await db.query(
        "UPDATE jobs SET state=$1,last_error=$2,run_at=now()+interval '1 minute'*$3::int,lease_until=NULL WHERE id=$4 AND lease_token=$5 RETURNING id",
        [
          terminal ? 'failed' : 'queued',
          message,
          Math.pow(2, job.attempts),
          job.id,
          job.lease_token,
        ],
      );
      if (rows.length && job.kind === 'analyze')
        await db.query('UPDATE documents SET status=$1,error=$2 WHERE id=$3 AND workspace_id=$4', [
          terminal ? 'failed' : 'queued',
          message,
          job.payload.documentId,
          job.workspace_id,
        ]);
    });
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
export async function remindersOnce() {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return;
  // A transaction lock per reminder protects multiple workers; Resend also deduplicates crash retries.
  const actions = await query(
    `SELECT a.id,a.due_date,a.workspace_id,m.user_id FROM actions a JOIN memberships m ON m.workspace_id=a.workspace_id JOIN users u ON u.id=m.user_id WHERE a.confirmed AND NOT a.done AND u.verified AND a.due_date BETWEEN (now() AT TIME ZONE 'Europe/Paris')::date AND (now() AT TIME ZONE 'Europe/Paris')::date+1`,
  );
  for (const a of actions)
    await query(
      'INSERT INTO reminders(id,action_id,user_id,due_date) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [randomUUID(), a.id, a.user_id, a.due_date],
    );
  await transaction(async (db) => {
    const {
      rows: [r],
    } = await db.query(
      `SELECT r.*,u.email FROM reminders r JOIN users u ON u.id=r.user_id JOIN actions a ON a.id=r.action_id JOIN memberships m ON m.user_id=r.user_id AND m.workspace_id=a.workspace_id WHERE r.state='pending' AND r.created_at>now()-interval '23 hours' AND a.confirmed AND NOT a.done AND a.due_date=r.due_date AND u.verified ORDER BY r.created_at FOR UPDATE OF r SKIP LOCKED LIMIT 1`,
    );
    if (!r) return;
    const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send(
      {
        from: process.env.RESEND_FROM!,
        to: r.email,
        subject: 'BRAINMAIL · Une échéance approche',
        text: `Une action confirmée arrive à échéance. Consultez votre espace sécurisé : ${process.env.APP_URL}/app`,
      },
      { idempotencyKey: `reminder:${r.id}` },
    );
    if (error) throw new Error('Envoi du rappel indisponible.');
    await db.query("UPDATE reminders SET state='sent',provider_id=$1 WHERE id=$2", [
      data?.id,
      r.id,
    ]);
  });
  // Outside Resend's 24h deduplication window, stop and require review, never risk a duplicate send.
  await query(
    "UPDATE reminders SET state='needs_review' WHERE state='pending' AND created_at<now()-interval '23 hours'",
  );
}
