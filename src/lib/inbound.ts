import { Resend } from 'resend';
import { randomUUID } from 'node:crypto';
import { query, transaction, type Row } from './db';
import { enqueue } from './documents';
import { billingOf, planLimits } from './billing';
import { HttpError, limitedBody } from './security';
import { putFile, deleteFile, validateFile, MAX_FILE } from './storage';
// Reception lives in its own Resend account; sending (verification, reminders)
// keeps using RESEND_API_KEY unless a dedicated inbound key is configured.
export function inboundResend() {
  return new Resend(process.env.RESEND_INBOUND_API_KEY || process.env.RESEND_API_KEY!);
}
export async function acceptWebhook(request: Request) {
  if (
    process.env.RESEND_INBOUND_ENABLED !== 'true' ||
    !process.env.RESEND_WEBHOOK_SECRET ||
    !(process.env.RESEND_INBOUND_API_KEY || process.env.RESEND_API_KEY)
  )
    throw new HttpError(503, 'Réception email non activée.');
  const payload = (await limitedBody(request, 256 * 1024)).toString();
  let event;
  try {
    event = inboundResend().webhooks.verify({
      payload,
      headers: {
        id: request.headers.get('svix-id') || '',
        timestamp: request.headers.get('svix-timestamp') || '',
        signature: request.headers.get('svix-signature') || '',
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    });
  } catch {
    throw new HttpError(401, 'Signature webhook invalide.');
  }
  if (event.type !== 'email.received' && event.type !== 'inbox.email.received') return;
  let workspaces: Row[] = [];
  if (event.type === 'inbox.email.received')
    workspaces = await query('SELECT id FROM workspaces WHERE inbox_id=$1', [event.data.inbox_id]);
  else
    workspaces = await query('SELECT id FROM workspaces WHERE inbox_address=ANY($1::text[])', [
      (event.data.received_for || []).map((s) => s.toLowerCase()),
    ]);
  // Route only to a provisioned, exact inbox. Never accept a tenant ID supplied by a sender.
  for (const ws of workspaces) {
    // Monthly cap per workspace, driven by the owner's plan: a leaked address
    // cannot trigger unbounded paid analysis, and the cap scales with the tier.
    const [owner] = await query<{ user_id: string }>(
      "SELECT user_id FROM memberships WHERE workspace_id=$1 AND role='owner' LIMIT 1",
      [ws.id],
    );
    const limits = owner ? (await billingOf(owner.user_id)).limits : null;
    const cap = limits?.monthlyDocs ?? 20;
    const [quota] = await query<{ n: number }>(
      "SELECT count(*)::int AS n FROM documents WHERE workspace_id=$1 AND created_at>=date_trunc('month',now())",
      [ws.id],
    );
    if (quota.n >= cap) {
      // Not a silent drop: the workspace sees this row in its integrations
      // panel (state=failed, no content stored, not retried).
      await transaction((db) =>
        db.query(
          "INSERT INTO jobs(id,workspace_id,kind,payload,dedup_key,state,last_error) VALUES($1,$2,'inbound',$3,$4,'failed',$5) ON CONFLICT(dedup_key) DO NOTHING",
          [
            randomUUID(),
            ws.id,
            JSON.stringify({ type: event.type, email_id: event.data.email_id }),
            `dropped:${ws.id}:${event.data.email_id}`,
            `Plafond mensuel du palier ${limits?.label ?? 'Essai'} atteint (${cap} courriers/mois) — message ignoré sans analyse. Passez au palier supérieur depuis la page Abonnement.`,
          ],
        ),
      );
      continue;
    }
    await transaction((db) =>
      enqueue(db, ws.id, 'inbound', event, `inbound:${ws.id}:${event.data.email_id}`),
    );
  }
}
async function downloadAttachment(url: string) {
  const parsed = new URL(url);
  const allowed = (process.env.RESEND_ATTACHMENT_HOSTS || '').split(',').map((s) => s.trim());
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    !allowed.includes(parsed.hostname)
  )
    throw new Error('Hôte de pièce jointe non autorisé. Configurez RESEND_ATTACHMENT_HOSTS.');
  const r = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!r.ok) throw new Error('Téléchargement indisponible.');
  return limitedBody(
    new Request('https://internal.invalid', {
      method: 'POST',
      body: r.body,
      duplex: 'half',
    } as RequestInit),
    MAX_FILE,
  );
}
export async function importInbound(job: Row) {
  const resend = inboundResend();
  const event = job.payload;
  const emailId = event.data.email_id;
  const response =
    event.type === 'inbox.email.received'
      ? await resend.inboxes.threads.emails.get({
          inboxId: event.data.inbox_id,
          threadId: event.data.thread_id,
          emailId,
        })
      : await resend.emails.receiving.get(emailId);
  if (response.error || !response.data) throw new Error('Message Resend indisponible.');
  const email = response.data;
  if (email.attachments.length > 19) throw new Error('Trop de pièces jointes.');
  // Stable document ID stored before downloading: retries cannot create duplicate documents.
  const documentId = await transaction(async (db) => {
    const {
      rows: [j],
    } = await db.query('SELECT payload FROM jobs WHERE id=$1 FOR UPDATE', [job.id]);
    if (j.payload.documentId) return j.payload.documentId as string;
    const id = randomUUID();
    await db.query("INSERT INTO documents(id,workspace_id,source,title) VALUES($1,$2,'email',$3)", [
      id,
      job.workspace_id,
      (email.subject || 'Email reçu').slice(0, 200),
    ]);
    await db.query('UPDATE jobs SET payload=$1 WHERE id=$2', [
      JSON.stringify({ ...event, documentId: id }),
      job.id,
    ]);
    return id;
  });
  const [doc] = await query('SELECT status FROM documents WHERE id=$1 AND workspace_id=$2', [
    documentId,
    job.workspace_id,
  ]);
  // Deleted by the user meanwhile, or already imported: nothing left to do.
  if (!doc || doc.status !== 'capturing') return;
  const files: { bytes: Buffer; mime: string }[] = [
    { bytes: Buffer.from(JSON.stringify(email)), mime: 'application/json' },
  ];
  for (const attachment of email.attachments) {
    const { data, error } = await resend.emails.receiving.attachments.get({
      emailId,
      id: attachment.id,
    });
    if (error || !data) throw new Error('Pièce jointe indisponible.');
    if (data.size > MAX_FILE) throw new Error('Pièce jointe trop volumineuse.');
    files.push(await validateFile(await downloadAttachment(data.download_url)));
  }
  if (files.reduce((sum, f) => sum + f.bytes.length, 0) > 50 * 1024 * 1024)
    throw new Error('Email trop volumineux.');
  const uploaded: { id: string; key: string; mime: string; size: number; ordinal: number }[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i],
        id = randomUUID(),
        key = `${job.workspace_id}/${documentId}/${id}`;
      await putFile(key, file.bytes);
      uploaded.push({ id, key, mime: file.mime, size: file.bytes.length, ordinal: i + 1 });
    }
    await transaction(async (db) => {
      const {
        rows: [lease],
      } = await db.query(
        "SELECT id FROM jobs WHERE id=$1 AND lease_token=$2 AND lease_until>now() AND state='running' FOR UPDATE",
        [job.id, job.lease_token],
      );
      if (!lease) throw new Error('Lease expirée.');
      for (const file of uploaded)
        await db.query(
          'INSERT INTO document_files(id,document_id,workspace_id,storage_key,mime,size,ordinal) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [file.id, documentId, job.workspace_id, file.key, file.mime, file.size, file.ordinal],
        );
      await db.query("UPDATE documents SET status='queued' WHERE id=$1 AND workspace_id=$2", [
        documentId,
        job.workspace_id,
      ]);
      await enqueue(db, job.workspace_id, 'analyze', { documentId }, `analyze:${documentId}`);
    });
  } catch (e) {
    await Promise.allSettled(uploaded.map((f) => deleteFile(f.key)));
    throw e;
  }
}
