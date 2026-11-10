import { randomBytes, randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { z } from 'zod';
import { Resend } from 'resend';
import {
  authenticate,
  register,
  login,
  sendVerification,
  requestPasswordReset,
  resetPassword,
} from './auth';
import {
  billingOf,
  createCheckout,
  createPortal,
  gateWorkspaceCreation,
  gateMonthlyDocs,
  handleStripeEvent,
  planSchema,
  verifyStripeSignature,
} from './billing';
import { query, transaction } from './db';
import {
  HttpError,
  originCheck,
  clientIp,
  rateLimit,
  cookie,
  cookiesOf,
  hash,
  limitedBody,
  secret,
} from './security';
import {
  createDocument,
  createScan,
  pairScan,
  mobileScan,
  appendFile,
  finalizeDocument,
  documentDetail,
  deleteDocument,
  enqueue,
} from './documents';
import { getFile, MAX_FILE } from './storage';
import { dateSchema, integrations } from './providers';
import { acceptWebhook } from './inbound';
const uuid = z.string().uuid();
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase().trim()),
  password: z.string().min(12).max(128),
});
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
async function body(request: Request) {
  try {
    return JSON.parse((await limitedBody(request, 64 * 1024)).toString());
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, 'JSON invalide.');
  }
}
export async function handle(request: Request): Promise<Response> {
  try {
    return await route(request);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json({ error: 'Données invalides. Vérifiez les champs et les dates.' }, 400);
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error(
      'request_failed',
      error instanceof Error ? error.message : 'unknown',
      error instanceof Error ? error.stack?.split('\n').slice(1, 3).join(' | ') : '',
    );
    return json({ error: 'Opération indisponible. Vérifiez la configuration du service.' }, 500);
  }
}
async function route(request: Request): Promise<Response> {
  const url = new URL(request.url),
    parts = url.pathname.replace(/^\/api\//, '').split('/'),
    method = request.method;
  if (parts.join('/') === 'health' && method === 'GET') {
    await query('SELECT 1');
    // A queue age a monitor can alert on: the web health alone only proves PostgreSQL.
    const [q] = await query(
      "SELECT floor(extract(epoch FROM now()-min(run_at))/60)::int AS age FROM jobs WHERE state IN ('queued','running')",
    );
    return json({ status: 'ok', service: 'brainmail', queue_age_minutes: q?.age ?? 0 });
  }
  if (parts.join('/') === 'webhooks/resend' && method === 'POST') {
    await acceptWebhook(request);
    return json({ received: true });
  }
  if (parts.join('/') === 'webhooks/stripe' && method === 'POST') {
    // Stripe signs the raw body; verify before parsing. No session, no Origin.
    const raw = await request.text();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !verifyStripeSignature(secret, raw, request.headers.get('stripe-signature')))
      throw new HttpError(400, 'Signature webhook invalide.');
    await handleStripeEvent(
      JSON.parse(raw) as { type: string; data: { object: Record<string, unknown> } },
    );
    return json({ received: true });
  }
  if (!['GET', 'HEAD'].includes(method)) originCheck(request);
  if (parts[0] === 'auth') {
    if (method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
    const b = await body(request);
    if (parts[1] === 'forgot') {
      const email = z
        .email()
        .max(254)
        .transform((s) => s.toLowerCase().trim())
        .parse(b.email);
      const ip = clientIp(request);
      await rateLimit(`forgot-ip:${ip}`, 10);
      await rateLimit(`forgot:${email}`, 3);
      await requestPasswordReset(email);
      // Same answer whether the account exists or not: no way to probe a list of emails.
      return json({
        ok: true,
        message:
          'Si un compte existe pour cette adresse, un lien de réinitialisation vient de partir. Consultez votre boîte email.',
      });
    }
    if (parts[1] === 'reset') {
      const token = z.string().min(32).max(128).parse(b.token);
      const password = z.string().min(12).max(128).parse(b.password);
      const ip = clientIp(request);
      await rateLimit(`reset-ip:${ip}`, 10);
      await resetPassword(token, password);
      return json({ ok: true });
    }
    if (parts[1] === 'logout') {
      const t = cookiesOf(request).brainmail;
      if (t) await query('DELETE FROM sessions WHERE token_hash=$1', [hash(t)]);
      return json({ ok: true }, 200, { 'Set-Cookie': cookie('brainmail', '', '/', 0) });
    }
    if (parts[1] === 'verify') {
      const token = z.string().min(32).max(128).parse(b.token);
      await transaction(async (db) => {
        const {
          rows: [v],
        } = await db.query(
          'DELETE FROM verification_tokens WHERE token_hash=$1 AND expires_at>now() RETURNING user_id',
          [hash(token)],
        );
        if (!v) throw new HttpError(410, 'Lien expiré ou déjà utilisé.');
        await db.query('UPDATE users SET verified=true WHERE id=$1', [v.user_id]);
      });
      return json({ ok: true });
    }
    const c = credentials.parse(b);
    const ip = clientIp(request);
    // One source address: 60 attempts across all accounts, 10 against one account.
    // The account-wide cap is far higher, so a single address cannot lock a
    // customer out; locking them out takes at least ten distinct addresses.
    await rateLimit(`auth-ip:${ip}`, 60);
    await rateLimit(`auth:${c.email}:${ip}`, 10);
    await rateLimit(`auth-account:${c.email}`, 100);
    if (parts[1] === 'register') {
      const name = z.string().min(2).max(80).parse(b.name);
      const { token } = await register(c.email, c.password, name);
      const sent = await sendVerification(c.email, token);
      return json(
        {
          ok: true,
          verificationRequired:
            process.env.NODE_ENV === 'production' || process.env.LOCAL_DEV !== 'true',
          verificationSent: sent,
        },
        201,
      );
    }
    if (parts[1] === 'login') {
      const token = await login(c.email, c.password);
      return json({ ok: true }, 200, { 'Set-Cookie': cookie('brainmail', token) });
    }
    if (parts[1] === 'resend-verification') {
      // Require the password to prevent account enumeration and unsolicited mail.
      const { verifyPassword } = await import('./security');
      const [u] = await query('SELECT * FROM users WHERE email=$1', [c.email]);
      if (u && !u.verified && (await verifyPassword(c.password, u.password_hash))) {
        const token = secret();
        await query(
          "INSERT INTO verification_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '24 hours')",
          [hash(token), u.id],
        );
        await sendVerification(c.email, token);
      }
      return json({ ok: true });
    }
    throw new HttpError(404, 'Route inconnue.');
  }
  if (parts[0] === 'mobile') {
    if (parts[1] === 'pair' && method === 'POST') {
      const b = await body(request),
        token = z.string().min(32).max(128).parse(b.token);
      await rateLimit(`pair:${hash(token)}`, 8);
      const { device, scan } = await pairScan(token);
      return json(scan, 200, {
        'Set-Cookie': cookie('brainmail_scan', device, '/api/mobile', 900),
      });
    }
    const scan = await mobileScan(cookiesOf(request).brainmail_scan || '');
    if (parts[1] === 'status' && method === 'GET') {
      const [count] = await query(
        'SELECT count(*)::int AS pages FROM document_files WHERE document_id=$1 AND workspace_id=$2',
        [scan.document_id, scan.workspace_id],
      );
      return json({ ...count, expiresAt: scan.expires_at });
    }
    if (parts[1] === 'pages' && method === 'POST') {
      await rateLimit(`upload:${scan.id}`, 40);
      return json(
        await appendFile(
          scan.workspace_id,
          scan.document_id,
          await limitedBody(request, MAX_FILE),
          scan.id,
        ),
        201,
      );
    }
    if (parts[1] === 'complete' && method === 'POST') {
      await finalizeDocument(scan.workspace_id, scan.document_id, scan.id);
      return json({ ok: true }, 200, {
        'Set-Cookie': cookie('brainmail_scan', '', '/api/mobile', 0),
      });
    }
    throw new HttpError(404, 'Route inconnue.');
  }
  const user = await authenticate(request),
    ws = user.workspaceId;
  if (parts[0] === 'me' && method === 'GET') {
    const workspaces = await query(
      'SELECT w.id,w.name FROM workspaces w JOIN memberships m ON m.workspace_id=w.id WHERE m.user_id=$1 ORDER BY w.name',
      [user.userId],
    );
    const [workspace] = await query(
      'SELECT id,name,preferences,memory_enabled,inbox_address FROM workspaces WHERE id=$1',
      [ws],
    );
    const integrationJobs = await query(
      "SELECT kind,state,last_error,created_at FROM jobs WHERE workspace_id=$1 AND kind IN ('inbound','memory') ORDER BY created_at DESC LIMIT 10",
      [ws],
    );
    return json({
      user,
      workspaces,
      workspace,
      billing: await billingOf(user.userId),
      integrations: integrations(),
      integrationJobs,
    });
  }
  if (parts[0] === 'billing') {
    if (parts[1] === 'status' && method === 'GET') return json(await billingOf(user.userId));
    if (user.role !== 'owner') throw new HttpError(403, 'Accès propriétaire requis.');
    if (parts[1] === 'checkout' && method === 'POST') {
      const b = await body(request);
      const plan = planSchema.parse(b.plan);
      const appUrl = process.env.APP_URL || new URL(request.url).origin;
      return json({ url: await createCheckout(user.userId, user.email, plan, appUrl) });
    }
    if (parts[1] === 'portal' && method === 'POST') {
      const appUrl = process.env.APP_URL || new URL(request.url).origin;
      return json({ url: await createPortal(user.userId, appUrl) });
    }
    throw new HttpError(404, 'Route inconnue.');
  }
  if (parts[0] === 'workspaces' && method === 'POST') {
    const b = await body(request);
    if (parts[1] === 'switch') {
      const id = uuid.parse(b.id);
      const [m] = await query('SELECT 1 FROM memberships WHERE user_id=$1 AND workspace_id=$2', [
        user.userId,
        id,
      ]);
      if (!m) throw new HttpError(403, 'Accès refusé.');
      await query('UPDATE sessions SET workspace_id=$1 WHERE token_hash=$2', [
        id,
        hash(cookiesOf(request).brainmail),
      ]);
      return json({ ok: true });
    }
    await rateLimit(`workspace:${user.userId}`, 10, 86400);
    await gateWorkspaceCreation(user.userId);
    const name = z.string().min(2).max(80).parse(b.name);
    const id = randomUUID();
    await transaction(async (db) => {
      await db.query('INSERT INTO workspaces(id,name) VALUES($1,$2)', [id, name]);
      await db.query('INSERT INTO memberships(user_id,workspace_id) VALUES($1,$2)', [
        user.userId,
        id,
      ]);
    });
    return json({ id }, 201);
  }
  if (parts[0] === 'settings' && method === 'PATCH') {
    if (user.role !== 'owner') throw new HttpError(403, 'Accès propriétaire requis.');
    const b = z
      .object({ preferences: z.string().max(4000), memoryEnabled: z.boolean() })
      .parse(await body(request));
    await transaction(async (db) => {
      await db.query('UPDATE workspaces SET preferences=$1,memory_enabled=$2 WHERE id=$3', [
        b.preferences,
        b.memoryEnabled,
        ws,
      ]);
      if (b.memoryEnabled && b.preferences)
        await enqueue(db, ws, 'memory', {}, `memory:${ws}:${randomUUID()}`);
    });
    return json({ ok: true });
  }
  if (parts[0] === 'inbox' && method === 'POST') {
    if (
      user.role !== 'owner' ||
      process.env.RESEND_INBOUND_ENABLED !== 'true' ||
      !(process.env.RESEND_INBOUND_API_KEY || process.env.RESEND_API_KEY) ||
      !process.env.RESEND_INBOUND_DOMAIN
    )
      throw new HttpError(503, 'Resend Inboxes non configuré.');
    // Random per-workspace address: a leaked address can be rotated, and the
    // caller cannot bind another workspace’s address.
    const rotate = Boolean((await body(request)).rotate);
    const address = `bm.${randomBytes(8).toString('hex')}@${process.env.RESEND_INBOUND_DOMAIN}`;
    const provisioned = await transaction(async (db) => {
      const {
        rows: [w],
      } = await db.query('SELECT inbox_address,inbox_id FROM workspaces WHERE id=$1 FOR UPDATE', [
        ws,
      ]);
      if (w.inbox_address && !rotate) return { address: w.inbox_address, rotated: false };
      const { inboundResend } = await import('./inbound');
      const resend = inboundResend();
      let { data, error } = await resend.inboxes.get(address);
      let id = data?.id;
      if (!id) {
        const created = await resend.inboxes.create({ emailAddress: address, name: 'BRAINMAIL' });
        id = created.data?.id;
        error = created.error;
      }
      if (error || !id) throw new HttpError(503, 'Création de boîte Resend indisponible.');
      // Disable any provider-side agent actions: all reasoning and approval stay in this app.
      const agent = await resend.inboxes.agent.update({ inboxId: id, actions: [] });
      if (agent.error)
        throw new HttpError(503, 'Impossible de désactiver les actions automatiques de la boîte.');
      await db.query('UPDATE workspaces SET inbox_address=$1,inbox_id=$2 WHERE id=$3', [
        address,
        id,
        ws,
      ]);
      return { address, rotated: Boolean(w.inbox_address) };
    });
    return json(provisioned);
  }
  if (parts[0] === 'scans') {
    if (method === 'POST' && !parts[1]) {
      await rateLimit(`scan:${ws}`, 30, 3600);
      await gateMonthlyDocs(ws, user.userId);
      const scan = await createScan(ws);
      const link = `${process.env.APP_URL || 'http://localhost:3000'}/scan#${scan.token}`;
      return json(
        {
          ...scan,
          token: undefined,
          url: link,
          qr: await QRCode.toDataURL(link, { width: 280, margin: 2 }),
        },
        201,
      );
    }
    const id = uuid.parse(parts[1]);
    const [scan] = await query(
      'SELECT id,document_id,expires_at,completed_at,device_hash IS NOT NULL AS paired FROM scans WHERE id=$1 AND workspace_id=$2',
      [id, ws],
    );
    if (!scan) throw new HttpError(404, 'Capture introuvable.');
    if (method === 'GET')
      return json({ ...scan, document: await documentDetail(ws, scan.document_id) });
    if (method === 'DELETE') {
      // Revoking a QR removes the abandoned capture entirely, but never a mail
      // the phone already sent for analysis (the screen may lag by a poll).
      await deleteDocument(ws, scan.document_id, { onlyCapturing: true });
      return json({ ok: true });
    }
  }
  if (parts[0] === 'documents') {
    if (!parts[1]) {
      if (method === 'GET') {
        const search = (url.searchParams.get('q') || '').slice(0, 200),
          archive = url.searchParams.get('archived') === 'true';
        return json(
          await query(
            'SELECT id,title,source,status,category,sender,summary,folder,archived,created_at,error FROM documents WHERE workspace_id=$1 AND archived=$2 AND (title ILIKE $3 OR sender ILIKE $3 OR summary ILIKE $3 OR folder ILIKE $3) ORDER BY created_at DESC LIMIT 200',
            [ws, archive, `%${search}%`],
          ),
        );
      }
      if (method === 'POST') {
        await rateLimit(`documents:${ws}`, 50, 3600);
        await gateMonthlyDocs(ws, user.userId);
        return json({ id: await createDocument(ws, 'pdf') }, 201);
      }
    }
    const id = uuid.parse(parts[1]);
    if (parts[2] === 'files' && method === 'POST') {
      await documentDetail(ws, id);
      return json(await appendFile(ws, id, await limitedBody(request, MAX_FILE)), 201);
    }
    if (parts[2] === 'complete' && method === 'POST') {
      await finalizeDocument(ws, id);
      return json({ ok: true });
    }
    if (parts[2] === 'dossier' && method === 'PUT') {
      const b = z.object({ dossierId: uuid.nullable() }).parse(await body(request));
      await transaction(async (db) => {
        if (b.dossierId) {
          const {
            rows: [ds],
          } = await db.query('SELECT id FROM dossiers WHERE id=$1 AND workspace_id=$2', [
            b.dossierId,
            ws,
          ]);
          if (!ds) throw new HttpError(404, 'Dossier introuvable.');
        }
        await db.query('UPDATE documents SET dossier_id=$1 WHERE id=$2 AND workspace_id=$3', [
          b.dossierId,
          id,
          ws,
        ]);
      });
      return json(await documentDetail(ws, id));
    }
    if (!parts[2] && method === 'DELETE') {
      // Permanent deletion of the document and its files (RGPD erasure).
      await rateLimit(`delete:${user.userId}`, 60, 3600);
      await deleteDocument(ws, id);
      return json({ ok: true });
    }
    if (parts[2] === 'retry' && method === 'POST') {
      await rateLimit(`retry:${id}`, 6, 3600);
      await transaction(async (db) => {
        const {
          rows: [d],
        } = await db.query(
          "UPDATE documents SET status='queued',error=NULL WHERE id=$1 AND workspace_id=$2 AND status='failed' RETURNING id",
          [id, ws],
        );
        if (!d) throw new HttpError(409, 'Seul un traitement en échec peut être relancé.');
        await db.query(
          "UPDATE jobs SET state='queued',attempts=0,run_at=now(),lease_token=NULL WHERE workspace_id=$1 AND dedup_key=$2",
          [ws, `analyze:${id}`],
        );
      });
      return json({ ok: true });
    }
    if (!parts[2] && method === 'GET') return json(await documentDetail(ws, id));
    if (!parts[2] && method === 'PATCH') {
      const b = z
        .object({
          title: z.string().min(1).max(200),
          category: z.string().min(1).max(80),
          folder: z.string().max(100),
          draft: z.string().max(12000),
          approved: z.boolean(),
          archived: z.boolean(),
        })
        .parse(await body(request));
      const rows = await query(
        "UPDATE documents SET title=$1,category=$2,folder=$3,draft=$4,draft_approved_at=CASE WHEN $5 THEN now() ELSE NULL END,archived=$6,updated_at=now() WHERE id=$7 AND workspace_id=$8 AND status='ready' RETURNING id",
        [b.title, b.category, b.folder, b.draft, b.approved, b.archived, id, ws],
      );
      if (!rows.length) throw new HttpError(404, 'Courrier prêt introuvable.');
      return json({ ok: true });
    }
  }
  if (parts[0] === 'files' && method === 'GET') {
    const id = uuid.parse(parts[1]);
    const [f] = await query('SELECT * FROM document_files WHERE id=$1 AND workspace_id=$2', [
      id,
      ws,
    ]);
    if (!f) throw new HttpError(404, 'Fichier introuvable.');
    return new Response(new Uint8Array(await getFile(f.storage_key)), {
      headers: {
        'Content-Type': f.mime,
        'Content-Disposition': `attachment; filename="brainmail-${f.ordinal}.${f.mime === 'application/pdf' ? 'pdf' : f.mime === 'application/json' ? 'json' : 'jpg'}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  if (parts[0] === 'dossiers') {
    if (!parts[1] && method === 'GET') {
      return json(
        await query(
          `SELECT d.id,d.label,d.status,d.created_at,d.updated_at,
            (SELECT count(*)::int FROM documents doc WHERE doc.dossier_id=d.id) AS docs,
            (SELECT count(*)::int FROM actions a JOIN documents doc ON doc.id=a.document_id WHERE doc.dossier_id=d.id AND a.confirmed AND NOT a.done) AS pending,
            (SELECT to_char(min(a.due_date),'YYYY-MM-DD') FROM actions a JOIN documents doc ON doc.id=a.document_id WHERE doc.dossier_id=d.id AND a.confirmed AND NOT a.done) AS next_due
           FROM dossiers d WHERE d.workspace_id=$1 ORDER BY d.created_at DESC LIMIT 100`,
          [ws],
        ),
      );
    }
    if (!parts[1] && method === 'POST') {
      const b = z
        .object({ label: z.string().min(1).max(120), documentId: uuid.optional() })
        .parse(await body(request));
      await rateLimit(`dossiers:${user.userId}`, 60, 3600);
      const id = randomUUID();
      await transaction(async (db) => {
        await db.query('INSERT INTO dossiers(id,workspace_id,label) VALUES($1,$2,$3)', [
          id,
          ws,
          b.label,
        ]);
        if (b.documentId)
          await db.query('UPDATE documents SET dossier_id=$1 WHERE id=$2 AND workspace_id=$3', [
            id,
            b.documentId,
            ws,
          ]);
      });
      return json({ id }, 201);
    }
    const id = uuid.parse(parts[1]);
    if (method === 'PATCH') {
      const b = z
        .object({
          label: z.string().min(1).max(120).optional(),
          status: z.enum(['ouvert', 'en_cours', 'resolu', 'cloture']).optional(),
        })
        .refine((v) => v.label !== undefined || v.status !== undefined)
        .parse(await body(request));
      const rows = await query(
        `UPDATE dossiers SET label=coalesce($1,label),status=coalesce($2,status),updated_at=now() WHERE id=$3 AND workspace_id=$4 RETURNING id`,
        [b.label ?? null, b.status ?? null, id, ws],
      );
      if (!rows.length) throw new HttpError(404, 'Dossier introuvable.');
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await query('DELETE FROM dossiers WHERE id=$1 AND workspace_id=$2', [id, ws]);
      return json({ ok: true });
    }
    throw new HttpError(405, 'Méthode non autorisée.');
  }
  if (parts[0] === 'actions') {
    if (method === 'GET')
      return json(
        await query(
          "SELECT a.*,to_char(a.due_date,'YYYY-MM-DD') AS due_date,d.title FROM actions a JOIN documents d ON d.id=a.document_id AND d.workspace_id=a.workspace_id WHERE a.workspace_id=$1 ORDER BY a.due_date NULLS LAST LIMIT 500",
          [ws],
        ),
      );
    if (method === 'PATCH') {
      const id = uuid.parse(parts[1]),
        b = z
          .object({
            label: z.string().min(1).max(300),
            dueDate: dateSchema.nullable(),
            confirmed: z.boolean(),
            done: z.boolean(),
          })
          .parse(await body(request));
      const rows = await query(
        'UPDATE actions SET label=$1,due_date=$2,confirmed=$3,done=$4 WHERE id=$5 AND workspace_id=$6 RETURNING id',
        [b.label, b.dueDate, b.confirmed, b.done, id, ws],
      );
      if (!rows.length) throw new HttpError(404, 'Action introuvable.');
      return json({ ok: true });
    }
  }
  throw new HttpError(404, 'Route inconnue.');
}
