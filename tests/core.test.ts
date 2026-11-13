import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
process.env.LOCAL_DEV = 'true';
process.env.LOCAL_DB_PATH = ':memory:';
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_ENCRYPTION_KEY = randomBytes(32).toString('base64');
process.env.APP_URL = 'http://localhost:3000';
delete process.env.DATABASE_URL;
import { migrate, query, transaction, database } from '../src/lib/db';
import { handle } from '../src/lib/api';
import {
  createScan,
  pairScan,
  mobileScan,
  appendFile,
  finalizeDocument,
  documentDetail,
} from '../src/lib/documents';
import { claimJob, processJob, workOnce, remindersOnce } from '../src/lib/worker';
import { encrypt, decrypt, hash } from '../src/lib/security';
import { planLimits, verifyStripeSignature, billingOf } from '../src/lib/billing';
import { validateFile, getFile } from '../src/lib/storage';
import {
  dateSchema,
  dateSupported,
  analyze,
  ocr,
  recallMemory,
  type Analysis,
} from '../src/lib/providers';
let temp: string, jpg: Buffer, a: { cookie: string; ws: string }, b: { cookie: string; ws: string };
const output: Analysis = {
  title: 'Avis de cotisation',
  category: 'Assurance',
  sender: 'Assureur test',
  recipient: 'Société test',
  summary: 'Cotisation à vérifier.',
  actions: [
    {
      label: 'Vérifier la cotisation',
      dueDate: '2026-12-15',
      evidence: 'Avant le 15 décembre 2026',
    },
  ],
  draft: 'Madame, Monsieur, merci de confirmer le détail de cette cotisation.',
};
const providers = {
  ocr: async () => 'Avis de cotisation. Avant le 15 décembre 2026',
  analyze: async () => output,
};
async function request(
  route: string,
  method = 'GET',
  body?: unknown,
  session?: string,
  origin = 'http://localhost:3000',
) {
  const r = await handle(
    new Request(`http://localhost:3000/api/${route}`, {
      method,
      headers: {
        origin,
        ...(session ? { cookie: session } : {}),
        'Content-Type': Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json',
      },
      body:
        body === undefined
          ? undefined
          : Buffer.isBuffer(body)
            ? new Uint8Array(body)
            : JSON.stringify(body),
    }),
  );
  return {
    status: r.status,
    data: r.headers.get('content-type')?.includes('application/json')
      ? await r.json()
      : await r.arrayBuffer(),
    cookie: r.headers.get('set-cookie'),
  };
}
async function account(email: string) {
  assert.equal(
    (
      await request('auth/register', 'POST', {
        email,
        password: 'a-long-test-password!',
        name: email,
      })
    ).status,
    201,
  );
  const r = await request('auth/login', 'POST', { email, password: 'a-long-test-password!' });
  assert.equal(r.status, 200);
  const c = r.cookie!.split(';')[0];
  const me = await request('me', 'GET', undefined, c);
  return { cookie: c, ws: me.data.workspace.id };
}
before(async () => {
  temp = await mkdtemp(path.join(os.tmpdir(), 'brainmail-test-'));
  process.env.LOCAL_STORAGE_PATH = temp;
  await migrate();
  jpg = await sharp({ create: { width: 24, height: 24, channels: 3, background: '#ffffff' } })
    .jpeg()
    .toBuffer();
  a = await account('alpha@example.test');
  b = await account('beta@example.test');
});
after(async () => {
  await (await database()).close();
  await rm(temp, { recursive: true, force: true });
});
test('authentification obligatoire et protection des requêtes cross-site', async () => {
  assert.equal((await request('documents')).status, 401);
  assert.equal((await request('scans', 'POST', {}, a.cookie, 'https://evil.example')).status, 403);
  assert.equal(
    (
      await request('auth/login', 'POST', {
        email: 'alpha@example.test',
        password: 'wrong-password-long',
      })
    ).status,
    401,
  );
});
test('QR utilisable une seule fois, lié au téléphone et limité dans le temps', async () => {
  const scan = await createScan(a.ws);
  const results = await Promise.allSettled([pairScan(scan.token), pairScan(scan.token)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const paired = (results.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>)
    .value;
  assert.equal((await mobileScan(paired.device)).workspace_id, a.ws);
  await assert.rejects(mobileScan('bad-token'));
  await query("UPDATE scans SET expires_at=now()-interval '1 minute' WHERE id=$1", [scan.id]);
  await assert.rejects(mobileScan(paired.device));
  await assert.rejects(appendFile(a.ws, scan.documentId, jpg, scan.id));
});
test('parcours multipage → OCR → classement → échéance → réponse → archivage', async () => {
  const scan = await createScan(a.ws),
    { device } = await pairScan(scan.token);
  await appendFile(a.ws, scan.documentId, jpg, scan.id);
  await appendFile(a.ws, scan.documentId, jpg, scan.id);
  const before = await documentDetail(a.ws, scan.documentId);
  assert.equal(before.files.length, 2);
  await Promise.all([
    finalizeDocument(a.ws, scan.documentId, scan.id),
    finalizeDocument(a.ws, scan.documentId, scan.id),
  ]);
  await assert.rejects(mobileScan(device));
  await assert.rejects(appendFile(a.ws, scan.documentId, jpg));
  const jobs = await query("SELECT * FROM jobs WHERE kind='analyze'");
  assert.equal(jobs.length, 1);
  const job = await claimJob();
  await processJob(job, providers);
  const doc = await documentDetail(a.ws, scan.documentId);
  assert.equal(doc.status, 'ready');
  assert.equal(doc.category, 'Assurance');
  assert.equal(doc.actions.length, 1);
  assert.equal(doc.actions[0].confirmed, false);
  assert.equal(doc.draft_approved_at, null);
  assert.equal(
    (
      await request(
        `actions/${doc.actions[0].id}`,
        'PATCH',
        { label: 'Vérifier', dueDate: '2026-12-15', confirmed: true, done: false },
        a.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        `documents/${doc.id}`,
        'PATCH',
        {
          title: doc.title,
          category: doc.category,
          folder: 'Assurance / 2026',
          draft: doc.draft,
          approved: true,
          archived: true,
        },
        a.cookie,
      )
    ).status,
    200,
  );
  const saved = await documentDetail(a.ws, doc.id);
  assert.ok(saved.draft_approved_at);
  assert.equal(saved.archived, true);
  assert.equal(
    (await request('documents?archived=true', 'GET', undefined, a.cookie)).data.length,
    1,
  );
});
test('isolation : documents, originaux, actions, captures et changement d’espace', async () => {
  const [d] = await query("SELECT * FROM documents WHERE status='ready' AND workspace_id=$1", [
    a.ws,
  ]);
  const doc = await documentDetail(a.ws, d.id);
  const [scan] = await query('SELECT id FROM scans WHERE document_id=$1', [d.id]);
  for (const route of [`documents/${d.id}`, `files/${doc.files[0].id}`, `scans/${scan.id}`])
    assert.equal((await request(route, 'GET', undefined, b.cookie)).status, 404);
  assert.equal((await request('documents', 'GET', undefined, b.cookie)).data.length, 0);
  assert.equal(
    (
      await request(
        `actions/${doc.actions[0].id}`,
        'PATCH',
        { label: 'vol', dueDate: null, confirmed: true, done: true },
        b.cookie,
      )
    ).status,
    404,
  );
  assert.equal((await request('workspaces/switch', 'POST', { id: a.ws }, b.cookie)).status, 403);
  assert.equal((await request(`documents/${d.id}/files`, 'POST', jpg, b.cookie)).status, 404);
});
test('chiffrement authentifié et lié à l’espace et au document', async () => {
  const bytes = Buffer.from('courrier confidentiel');
  const ciphertext = encrypt(bytes, 'tenant-a/doc-a');
  assert.notEqual(ciphertext.toString(), bytes.toString());
  assert.deepEqual(decrypt(ciphertext, 'tenant-a/doc-a'), bytes);
  assert.throws(() => decrypt(ciphertext, 'tenant-b/doc-a'));
  const corrupted = Buffer.from(ciphertext);
  corrupted[30] ^= 1;
  assert.throws(() => decrypt(corrupted, 'tenant-a/doc-a'));
  const [file] = await query('SELECT storage_key FROM document_files LIMIT 1');
  const disk = await readFile(path.join(temp, file.storage_key));
  assert.notEqual(disk[0], 0xff);
  assert.equal((await getFile(file.storage_key))[0], 0xff);
});
test('validation réelle des fichiers, PDF multipage et dates impossibles', async () => {
  await assert.rejects(validateFile(Buffer.from('<svg onload="alert(1)"></svg>')));
  await assert.rejects(validateFile(Buffer.from('%PDF-broken')));
  assert.equal(dateSchema.safeParse('2026-02-30').success, false);
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.addPage();
  assert.equal((await validateFile(Buffer.from(await pdf.save()))).mime, 'application/pdf');
  for (let i = 0; i < 19; i++) pdf.addPage();
  await assert.rejects(validateFile(Buffer.from(await pdf.save())));
});
test('import PDF et interdiction de finaliser une capture vide', async () => {
  const d = await request('documents', 'POST', {}, a.cookie);
  assert.equal(
    (await request(`documents/${d.data.id}/complete`, 'POST', {}, a.cookie)).status,
    400,
  );
  const pdf = await PDFDocument.create();
  pdf.addPage();
  assert.equal(
    (await request(`documents/${d.data.id}/files`, 'POST', Buffer.from(await pdf.save()), a.cookie))
      .status,
    201,
  );
  assert.equal(
    (await request(`documents/${d.data.id}/complete`, 'POST', {}, a.cookie)).status,
    200,
  );
  await workOnce(providers);
  assert.equal((await documentDetail(a.ws, d.data.id)).status, 'ready');
});
test('exclusivité des jobs et protection contre un worker dont le bail a expiré', async () => {
  const s = await createScan(a.ws);
  await appendFile(a.ws, s.documentId, jpg);
  await finalizeDocument(a.ws, s.documentId);
  const jobs = await Promise.all([claimJob(), claimJob()]);
  assert.equal(jobs.filter(Boolean).length, 1);
  const job = jobs.find(Boolean)!;
  await query("UPDATE jobs SET lease_until=now()-interval '1 minute' WHERE id=$1", [job.id]);
  const replacement = await claimJob();
  assert.notEqual(replacement.lease_token, job.lease_token);
  await assert.rejects(processJob(job, providers));
  await processJob(replacement, providers);
  assert.equal((await documentDetail(a.ws, s.documentId)).status, 'ready');
});
test('absence de clés : échec explicite et relance possible sans résultat inventé', async () => {
  const s = await createScan(a.ws);
  await appendFile(a.ws, s.documentId, jpg);
  await finalizeDocument(a.ws, s.documentId);
  await workOnce();
  const doc = await documentDetail(a.ws, s.documentId);
  assert.equal(doc.status, 'failed');
  assert.match(doc.error, /non configuré/);
  assert.equal(doc.summary, '');
  assert.equal((await request(`documents/${doc.id}/retry`, 'POST', {}, a.cookie)).status, 200);
  await workOnce(providers);
  assert.equal((await documentDetail(a.ws, s.documentId)).status, 'ready');
});
test('contrat OCR et analyse Mistral direct : sorties validées et date sans citation supprimée', async () => {
  const old = globalThis.fetch;
  process.env.MISTRAL_API_KEY = 'test-only';
  try {
    globalThis.fetch = async (input, init) => {
      const b = JSON.parse(init!.body as string);
      if (String(input).includes('/ocr')) {
        assert.equal(b.document.type, 'image_url');
        return Response.json({ pages: [{ markdown: 'Texte test' }] });
      }
      // Analyse : appel direct à l'API Mistral, sans intermédiaire.
      assert.ok(String(input).includes('api.mistral.ai/v1/chat/completions'));
      assert.equal(b.response_format.type, 'json_schema');
      assert.equal(b.response_format.json_schema.strict, true);
      assert.ok(!('provider' in b));
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...output,
                actions: [{ label: 'Action', dueDate: '2026-12-15', evidence: 'citation absente' }],
              }),
            },
          },
        ],
      });
    };
    assert.equal(await ocr(jpg, 'image/jpeg'), 'Texte test');
    const result = await analyze('Texte test', 'Ton courtois');
    assert.equal(result.actions[0].dueDate, null);
    globalThis.fetch = async () =>
      Response.json({ choices: [{ message: { content: '{"title":true}' } }] });
    await assert.rejects(analyze('texte', ''));
  } finally {
    globalThis.fetch = old;
    delete process.env.MISTRAL_API_KEY;
  }
});
test('webhook signé, routage explicite et déduplication de livraison', async () => {
  process.env.RESEND_API_KEY = 'test-only';
  process.env.RESEND_INBOUND_ENABLED = 'true';
  const signing = randomBytes(32);
  process.env.RESEND_WEBHOOK_SECRET = 'whsec_' + signing.toString('base64');
  try {
    await query('UPDATE workspaces SET inbox_address=$1 WHERE id=$2', [
      'alpha@in.example.test',
      a.ws,
    ]);
    const payload = JSON.stringify({
      type: 'email.received',
      created_at: new Date().toISOString(),
      data: {
        email_id: randomUUID(),
        to: ['alpha@in.example.test'],
        received_for: ['alpha@in.example.test'],
        attachments: [],
      },
    });
    const id = 'msg_test',
      timestamp = String(Math.floor(Date.now() / 1000)),
      signature = createHmac('sha256', signing)
        .update(`${id}.${timestamp}.${payload}`)
        .digest('base64');
    const call = (sig: string) =>
      handle(
        new Request('http://localhost:3000/api/webhooks/resend', {
          method: 'POST',
          headers: { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': sig },
          body: payload,
        }),
      );
    assert.equal((await call('bad')).status, 401);
    assert.equal((await call(`v1,${signature}`)).status, 200);
    assert.equal((await call(`v1,${signature}`)).status, 200);
    assert.equal((await query("SELECT * FROM jobs WHERE kind='inbound'")).length, 1);
  } finally {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_WEBHOOK_SECRET;
    process.env.RESEND_INBOUND_ENABLED = 'false';
  }
});
test('cookie de session HttpOnly et invalidation à la déconnexion', async () => {
  const r = await request('auth/login', 'POST', {
    email: 'beta@example.test',
    password: 'a-long-test-password!',
  });
  assert.match(r.cookie!, /HttpOnly/);
  assert.match(r.cookie!, /SameSite=Strict/);
  const session = r.cookie!.split(';')[0];
  await request('auth/logout', 'POST', {}, session);
  assert.equal((await request('me', 'GET', undefined, session)).status, 401);
});

test('rappels : confirmation, déduplication et absence de contenu confidentiel dans l’email', async () => {
  await query('UPDATE actions SET done=true');
  const [d] = await query(
    "SELECT id FROM documents WHERE workspace_id=$1 AND status='ready' LIMIT 1",
    [a.ws],
  );
  const id = randomUUID();
  await query(
    "INSERT INTO actions(id,workspace_id,document_id,label,due_date,evidence) VALUES($1,$2,$3,'Texte confidentiel',(now() AT TIME ZONE 'Europe/Paris')::date,'preuve')",
    [id, a.ws, d.id],
  );
  const original = globalThis.fetch;
  let sent = 0;
  process.env.RESEND_API_KEY = 'test-only';
  process.env.RESEND_FROM = 'test@example.test';
  try {
    globalThis.fetch = async (_input, init) => {
      sent++;
      const body = JSON.parse(init!.body as string);
      assert.ok(!JSON.stringify(body).includes('confidentiel'));
      const headers = new Headers(init!.headers);
      assert.match(headers.get('idempotency-key') || '', /^reminder:/);
      return Response.json({ id: 'test-reminder' });
    };
    await remindersOnce();
    assert.equal(sent, 0);
    await query('UPDATE actions SET confirmed=true WHERE id=$1', [id]);
    await Promise.all([remindersOnce(), remindersOnce()]);
    await remindersOnce();
    assert.equal(sent, 1);
  } finally {
    globalThis.fetch = original;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
  }
});
test('mémoire : filtre par société et rejet des préférences obsolètes', async () => {
  const original = globalThis.fetch;
  process.env.MEM0_API_KEY = 'test-only';
  try {
    globalThis.fetch = async (_url, init) => {
      const b = JSON.parse(init!.body as string);
      assert.equal(b.filters.user_id, `brainmail:${a.ws}`);
      return Response.json({
        results: [
          { memory: 'Contexte actuel', metadata: { preferences_hash: hash('actuel') } },
          { memory: 'Contexte ancien', metadata: { preferences_hash: hash('ancien') } },
        ],
      });
    };
    assert.deepEqual(await recallMemory(a.ws, 'actuel'), ['Contexte actuel']);
    globalThis.fetch = async () => {
      throw new Error('indisponible');
    };
    assert.deepEqual(await recallMemory(a.ws, 'actuel'), []);
  } finally {
    globalThis.fetch = original;
    delete process.env.MEM0_API_KEY;
  }
});
test('dossiers : création, rattachement, cycle de vie et isolation', async () => {
  const d = await request('documents', 'POST', undefined, a.cookie);
  const id = d.data.id;
  const cr = await request(
    'dossiers',
    'POST',
    { label: 'Dossier URSSAF 2027', documentId: id },
    a.cookie,
  );
  assert.equal(cr.status, 201);
  // isolation : l'espace de b ne voit pas le dossier de a
  assert.equal((await request('dossiers', 'GET', undefined, b.cookie)).data.length, 0);
  const list = await request('dossiers', 'GET', undefined, a.cookie);
  assert.equal(list.data[0].docs, 1);
  assert.equal(list.data[0].label, 'Dossier URSSAF 2027');
  // rattachement à un dossier d'un autre espace : refusé
  const nope = await request(
    `documents/${id}/dossier`,
    'PUT',
    { dossierId: randomUUID() },
    a.cookie,
  );
  assert.equal(nope.status, 404);
  // détail du courrier : le dossier est exposé
  const det = await request(`documents/${id}`, 'GET', undefined, a.cookie);
  assert.equal(det.data.dossier.label, 'Dossier URSSAF 2027');
  // cycle de vie
  assert.equal(
    (await request(`dossiers/${cr.data.id}`, 'PATCH', { status: 'resolu' }, a.cookie)).status,
    200,
  );
  assert.equal(
    (await request(`dossiers/${cr.data.id}`, 'PATCH', { status: 'resolu' }, b.cookie)).status,
    404,
  );
  // détachement
  const det2 = await request(`documents/${id}/dossier`, 'PUT', { dossierId: null }, a.cookie);
  assert.equal(det2.status, 200);
  assert.equal(det2.data.dossier, null);
});
test('crash après la dernière tentative : le courrier devient relançable', async () => {
  const s = await createScan(a.ws);
  await appendFile(a.ws, s.documentId, jpg);
  await finalizeDocument(a.ws, s.documentId);
  await query(
    "UPDATE jobs SET state='running',attempts=4,lease_until=now()-interval '1 minute' WHERE dedup_key=$1",
    [`analyze:${s.documentId}`],
  );
  await claimJob();
  const d = await documentDetail(a.ws, s.documentId);
  assert.equal(d.status, 'failed');
});
test('liste d’invitation : espaces et casse tolérés, hors liste refusée', async () => {
  process.env.SIGNUP_EMAIL_ALLOWLIST = ' Owner@Example.test , Gamma@Example.test  ';
  try {
    assert.equal(
      (
        await request('auth/register', 'POST', {
          email: 'gamma@example.test',
          password: 'a-long-test-password!',
          name: 'Gamma',
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await request('auth/register', 'POST', {
          email: 'outsider@example.test',
          password: 'a-long-test-password!',
          name: 'Hors liste',
        })
      ).status,
      403,
    );
  } finally {
    delete process.env.SIGNUP_EMAIL_ALLOWLIST;
  }
});
test('suppression définitive d’un courrier, fichiers et capture abandonnée', async () => {
  const s = await createScan(a.ws);
  await appendFile(a.ws, s.documentId, jpg, s.id);
  assert.equal((await request(`scans/${s.id}`, 'DELETE', undefined, b.cookie)).status, 404);
  assert.equal((await request(`scans/${s.id}`, 'DELETE', undefined, a.cookie)).status, 200);
  const list = await request('documents', 'GET', undefined, a.cookie);
  assert.equal(
    list.data.some((x: Record<string, any>) => x.id === s.documentId),
    false,
  );
  const detail = await request(`documents/${s.documentId}`, 'GET', undefined, a.cookie);
  assert.equal(detail.status, 404);
});
test('échéance rejetée si la citation ne contient pas la date annoncée', async () => {
  const old = globalThis.fetch;
  process.env.MISTRAL_API_KEY = 'test-only';
  try {
    globalThis.fetch = async () =>
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...output,
                actions: [
                  {
                    label: 'Date cohérente',
                    dueDate: '2026-12-15',
                    evidence: 'Avant le 15 décembre 2026',
                  },
                  {
                    label: 'Date non justifiée',
                    dueDate: '2027-01-31',
                    evidence: 'Avant le 15 décembre 2026',
                  },
                  {
                    label: 'Format numérique',
                    dueDate: '2026-12-15',
                    evidence: 'échéance : 15/12/2026',
                  },
                  {
                    label: 'Apostrophe variante',
                    dueDate: '2026-12-15',
                    evidence: 'Vous disposez d’un délai jusqu’au 15 décembre 2026',
                  },
                  { label: 'Sans citation', dueDate: '2026-12-15', evidence: '' },
                ],
              }),
            },
          },
        ],
      });
    const text =
      'Cotisation 2026. échéance : 15/12/2026. Avant le 15 décembre 2026. Vous disposez d un délai jusqu au 15 décembre 2026.';
    const result = await analyze(text, '');
    const byLabel = Object.fromEntries(result.actions.map((x) => [x.label, x.dueDate]));
    assert.equal(byLabel['Date cohérente'], '2026-12-15');
    assert.equal(byLabel['Date non justifiée'], null);
    assert.equal(byLabel['Format numérique'], '2026-12-15');
    assert.equal(byLabel['Apostrophe variante'], '2026-12-15');
    assert.equal(byLabel['Sans citation'], null);
  } finally {
    globalThis.fetch = old;
    delete process.env.MISTRAL_API_KEY;
  }
});
test('signature Stripe : rejet sans en-tête valide, accept du HMAC correct', () => {
  const secret = 'whsec_test';
  const payload = JSON.stringify({ type: 'ping', data: { object: {} } });
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  assert.equal(verifyStripeSignature(secret, payload, `t=${t},v1=${v1}`), true);
  assert.equal(verifyStripeSignature(secret, payload, `t=${t},v1=${'0'.repeat(64)}`), false);
  assert.equal(verifyStripeSignature(secret, payload, null), false);
  assert.equal(verifyStripeSignature('whsec_autre', payload, `t=${t},v1=${v1}`), false);
});

test('conversion : inscription et premier scan après transmission complète', async () => {
  const acc = await account('funnel@example.test');
  const [u] = await query<{ id: string }>("SELECT id FROM users WHERE email='funnel@example.test'");
  const states = async () => query<{ milestone: string }>(
    'SELECT milestone FROM conversion_milestones WHERE user_id=$1 ORDER BY milestone', [u.id],
  );
  assert.deepEqual((await states()).map(x => x.milestone), ['registered']);
  const scan = await request('scans', 'POST', {}, acc.cookie);
  assert.equal(scan.status, 201);
  const pair = await request('mobile/pair', 'POST', { token: scan.data.url.split('#')[1] });
  assert.equal(pair.status, 200);
  const mobileCookie = pair.cookie!.split(';')[0];
  assert.equal((await request('mobile/pages', 'POST', jpg, mobileCookie)).status, 201);
  assert.equal((await request('mobile/complete', 'POST', {}, mobileCookie)).status, 200);
  assert.deepEqual((await states()).map(x => x.milestone), ['first_scan', 'registered']);
  assert.equal((await request('metrics/funnel', 'GET', undefined, acc.cookie)).status, 403);
  process.env.METRICS_ADMIN_EMAIL = 'funnel@example.test';
  try {
    const report = await request('metrics/funnel', 'GET', undefined, acc.cookie);
    assert.equal(report.status, 200);
    assert.ok(report.data.totals.registered >= 1);
    assert.ok(report.data.totals.first_scan >= 1);
    assert.equal(JSON.stringify(report.data).includes('Avis de cotisation'), false);
  } finally { delete process.env.METRICS_ADMIN_EMAIL; }
});

test('conversion : trois courriers analysés comptés une seule fois', async () => {
  const acc = await account('three@example.test');
  const [u] = await query<{ id: string }>("SELECT id FROM users WHERE email='three@example.test'");
  const { recordThirdDocumentForWorkspace } = await import('../src/lib/conversion');
  for (let n = 0; n < 3; n++) {
    await query("INSERT INTO documents(id,workspace_id,source,status) VALUES($1,$2,'pdf','ready')", [
      randomUUID(), acc.ws,
    ]);
    await transaction(async db => recordThirdDocumentForWorkspace(db, acc.ws));
  }
  await transaction(async db => recordThirdDocumentForWorkspace(db, acc.ws));
  const rows = await query(
    "SELECT achieved_at FROM conversion_milestones WHERE user_id=$1 AND milestone='third_document'",
    [u.id],
  );
  assert.equal(rows.length, 1);
});

test('analyse : règles anti-défauts dans le prompt (destinataire, alternatives, échéances réelles) et citations nettoyées', async () => {
  const old = globalThis.fetch;
  process.env.MISTRAL_API_KEY = 'test-only';
  try {
    let seenPrompt = '';
    globalThis.fetch = async (input, init) => {
      const b = JSON.parse(init!.body as string);
      if (String(input).includes('/ocr')) return Response.json({ pages: [{ markdown: 'Texte test' }] });
      seenPrompt = b.messages[0].content;
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'Relance DURAND IMMO',
                category: 'Juridique',
                sender: 'DURAND IMMO',
                recipient: 'SCI WEINVEST',
                summary: 'Solde débiteur à régler.',
                actions: [
                  {
                    label: 'Régulariser le solde (virement, chèque ou mandat SEPA)',
                    dueDate: null,
                    evidence: '« « Solde débiteur à régulariser dès réception » »',
                  },
                ],
                draft: 'À l’attention de DURAND IMMO : nous accusons réception de votre relance.',
              }),
            },
          },
        ],
      });
    };
    const r = await analyze('Relance de DURAND IMMO. Solde débiteur à régulariser dès réception.', '');
    // Les trois règles contractuelles doivent figurer dans le prompt système.
    assert.ok(seenPrompt.includes('EXPÉDITEUR vs DESTINATAIRE'), 'règle destinataire manquante');
    assert.ok(seenPrompt.includes('ACTIONS ALTERNATIVES'), 'règle alternatives manquante');
    assert.ok(seenPrompt.includes('ÉCHÉANCES RÉELLES'), 'règle échéances manquante');
    assert.ok(seenPrompt.includes('sans guillemets ajoutés'), 'règle citations manquante');
    // Le destinataire extrait est renvoyé tel quel (pour l’avertissement UI).
    assert.equal(r.recipient, 'SCI WEINVEST');
    // Les guillemets doublés de la citation sont normalisés.
    assert.equal(r.actions[0].evidence, '« Solde débiteur à régulariser dès réception »');
    // La réponse s’adresse à l’expéditeur, pas à la société destinataire du courrier.
    assert.ok(!r.draft.startsWith('À l’attention de SCI WEINVEST'));
  } finally {
    globalThis.fetch = old;
    delete process.env.MISTRAL_API_KEY;
  }
});

test('paliers : limites par plan et palier essai sans abonnement', () => {
  assert.deepEqual(planLimits('solo'), {
    label: 'Solo',
    priceEnv: 'STRIPE_PRICE_SOLO',
    monthlyDocs: 50,
    workspaces: 1,
  });
  assert.equal(planLimits('pro').monthlyDocs, 200);
  assert.equal(planLimits('cabinet').workspaces, 10);
  assert.equal(planLimits('inconnu').monthlyDocs, 20);
  assert.equal(planLimits(null).workspaces, 1);
});

test('nettoyage : sessions, compteurs et captures expirés supprimés', async () => {
  await query(
    "INSERT INTO rate_limits(key,count,resets_at) VALUES('brainmail-stale',1,now()-interval '2 hours')",
  );
  const [existing] = await query<{ user_id: string; workspace_id: string }>(
    'SELECT user_id,workspace_id FROM sessions LIMIT 1',
  );
  await query(
    "INSERT INTO sessions(token_hash,user_id,workspace_id,expires_at) VALUES('stale-token',$1,$2,now()-interval '8 days')",
    [existing.user_id, existing.workspace_id],
  );
  const stale = await createScan(a.ws);
  await query("UPDATE scans SET expires_at=now()-interval '2 days' WHERE id=$1", [stale.id]);
  const { cleanupOnce } = await import('../src/lib/worker');
  await cleanupOnce();
  assert.equal((await query("SELECT 1 FROM rate_limits WHERE key='brainmail-stale'")).length, 0);
  assert.equal((await query("SELECT 1 FROM sessions WHERE token_hash='stale-token'")).length, 0);
  assert.equal((await query('SELECT 1 FROM scans WHERE id=$1', [stale.id])).length, 0);
});
test('nettoyage : capture vide abandonnée supprimée, capture avec pages conservée', async () => {
  const { cleanupOnce } = await import('../src/lib/worker');
  const empty = await createScan(a.ws);
  const withPage = await createScan(a.ws);
  await appendFile(a.ws, withPage.documentId, jpg, withPage.id);
  const recent = await createScan(a.ws);
  await query("UPDATE documents SET created_at=now()-interval '2 days' WHERE id=ANY($1::uuid[])", [
    [empty.documentId, withPage.documentId],
  ]);
  await query("UPDATE scans SET expires_at=now()-interval '1 hour' WHERE id=ANY($1::uuid[])", [
    [empty.id, withPage.id],
  ]);
  await cleanupOnce();
  await assert.rejects(documentDetail(a.ws, empty.documentId));
  assert.equal((await documentDetail(a.ws, withPage.documentId)).files.length, 1);
  assert.equal((await documentDetail(a.ws, recent.documentId)).status, 'capturing');
});
test('connexion : une seule adresse IP ne peut pas bloquer le compte d’un client', async () => {
  const login = (ip: string, password: string) =>
    handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
          'x-forwarded-for': ip,
        },
        body: JSON.stringify({ email: 'alpha@example.test', password }),
      }),
    );
  for (let n = 0; n < 10; n++)
    assert.equal((await login('203.0.113.7', 'wrong-password-long')).status, 401);
  assert.equal((await login('203.0.113.7', 'wrong-password-long')).status, 429);
  // A forged first X-Forwarded-For entry does not reset the attacker's counter.
  assert.equal((await login('198.51.100.1, 203.0.113.7', 'wrong-password-long')).status, 429);
  // The customer, from their own address, still gets in.
  assert.equal((await login('192.0.2.44', 'a-long-test-password!')).status, 200);
});
test('requête sans en-tête Origin : refusée si le navigateur la signale cross-site', async () => {
  const send = (headers: Record<string, string>) =>
    handle(
      new Request('http://localhost:3000/api/scans', {
        method: 'POST',
        headers: { cookie: a.cookie, 'Content-Type': 'application/json', ...headers },
        body: '{}',
      }),
    );
  assert.equal((await send({ 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await send({ 'sec-fetch-site': 'same-site' })).status, 403);
  assert.equal((await send({ 'sec-fetch-site': 'same-origin' })).status, 201);
  process.env.EXTRA_ORIGINS = 'pas une url, https://www.example.test';
  try {
    assert.equal((await send({ origin: 'https://www.example.test' })).status, 201);
    assert.equal((await send({ origin: 'https://evil.example' })).status, 403);
  } finally {
    delete process.env.EXTRA_ORIGINS;
  }
});
test('révoquer un QR après l’envoi depuis le téléphone ne supprime pas le courrier', async () => {
  const sent = (await request('scans', 'POST', {}, a.cookie)).data;
  await pairScan(sent.url.split('#')[1]);
  await appendFile(a.ws, sent.documentId, jpg, sent.id);
  await finalizeDocument(a.ws, sent.documentId, sent.id);
  assert.equal((await request(`scans/${sent.id}`, 'DELETE', undefined, a.cookie)).status, 409);
  assert.equal((await documentDetail(a.ws, sent.documentId)).files.length, 1);
  const unused = (await request('scans', 'POST', {}, a.cookie)).data;
  assert.equal((await request(`scans/${unused.id}`, 'DELETE', undefined, a.cookie)).status, 200);
  await assert.rejects(documentDetail(a.ws, unused.documentId));
});
test('échéance : année et délais relatifs vérifiés dans la citation', () => {
  assert.equal(dateSupported('2026-12-15', 'Avant le 15 décembre 2025'), false);
  assert.equal(dateSupported('2026-12-15', 'échéance : 15/12/25'), false);
  assert.equal(dateSupported('2026-12-15', 'échéance : 15/12/26'), true);
  assert.equal(
    dateSupported('2026-12-15', 'Facture 2025 à régler avant le 15 décembre 2026'),
    true,
  );
  assert.equal(dateSupported('2026-02-10', 'sous 30 jours à compter du 10 février'), false);
  // Jour/mois corrects mais année contredite par une date complète de la citation
  assert.equal(
    dateSupported('2027-02-10', 'Émis le 01/01/2027. Paiement avant le 10/02/2026'),
    false,
  );
  assert.equal(
    dateSupported('2026-12-15', 'Vous disposez d’un délai jusqu’au 15 décembre 2026'),
    true,
  );
});
test('plafond mensuel : scans et imports refusés une fois le quota du palier atteint', async () => {
  const c = await account('quota@example.test');
  assert.equal((await request('scans', 'POST', {}, c.cookie)).status, 201);
  // Essai : 20 courriers par mois. Un est déjà créé par le scan ci-dessus.
  for (let n = 0; n < 19; n++)
    await query("INSERT INTO documents(id,workspace_id,source) VALUES($1,$2,'pdf')", [
      randomUUID(),
      c.ws,
    ]);
  const scan = await request('scans', 'POST', {}, c.cookie);
  assert.equal(scan.status, 402);
  assert.match(scan.data.error, /Plafond de 20 courriers/);
  assert.equal((await request('documents', 'POST', {}, c.cookie)).status, 402);
});
test('abonnement résilié ou impayé : retour aux limites de l’essai', async () => {
  await account('resilie@example.test');
  const [u] = await query<{ id: string }>(
    "SELECT id FROM users WHERE email='resilie@example.test'",
  );
  await query(
    "INSERT INTO billing(user_id,plan,subscription_status) VALUES($1,'pro','active') ON CONFLICT(user_id) DO UPDATE SET plan='pro',subscription_status='active'",
    [u.id],
  );
  assert.equal((await billingOf(u.id)).limits.workspaces, 3);
  for (const status of ['canceled', 'unpaid', 'past_due']) {
    await query('UPDATE billing SET subscription_status=$1 WHERE user_id=$2', [status, u.id]);
    const b = await billingOf(u.id);
    assert.equal(b.active, false);
    assert.equal(b.limits.workspaces, 1);
    assert.equal(b.limits.monthlyDocs, 20);
  }
});
test('mot de passe oublié : même réponse que le compte existe ou non', async () => {
  const known = await request('auth/forgot', 'POST', { email: 'alpha@example.test' });
  const unknown = await request('auth/forgot', 'POST', { email: 'inconnu@example.test' });
  assert.equal(known.status, 200);
  assert.deepEqual(known.data, unknown.data);
  assert.equal('sent' in known.data, false);
});
test('réinitialisation : le lien reçu vaut vérification de l’adresse', async () => {
  await account('nonverifie@example.test');
  const [u] = await query<{ id: string }>(
    "UPDATE users SET verified=false WHERE email='nonverifie@example.test' RETURNING id",
  );
  const token = 'r'.repeat(40);
  await query(
    "INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')",
    [u.id, hash(token)],
  );
  const password = 'un-nouveau-mot-de-passe!';
  assert.equal((await request('auth/reset', 'POST', { token, password })).status, 200);
  const login = await request('auth/login', 'POST', { email: 'nonverifie@example.test', password });
  assert.equal(login.status, 200);
  // Le lien ne sert qu'une fois.
  assert.equal((await request('auth/reset', 'POST', { token, password })).status, 410);
});
test('signature Stripe : message ancien refusé, rotation de secret acceptée', () => {
  const secret = 'whsec_test';
  const payload = JSON.stringify({ type: 'customer.subscription.updated', data: { object: {} } });
  const sign = (t: number) => createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  const old = now - 3600;
  assert.equal(verifyStripeSignature(secret, payload, `t=${old},v1=${sign(old)}`), false);
  assert.equal(
    verifyStripeSignature(secret, payload, `t=${now},v1=${'0'.repeat(64)},v1=${sign(now)}`),
    true,
  );
  assert.equal(verifyStripeSignature(secret, payload, `t=abc,v1=${sign(now)}`), false);
});
test('sauvegarde : export chiffré, restauration complète, jamais d’écrasement', async () => {
  const { exportDatabase, restoreDatabase, backupOnce, backupMaybe, backupName } =
    await import('../src/lib/backup');
  const { listBackups, getBackup } = await import('../src/lib/storage');
  const kept = [
    'users',
    'workspaces',
    'memberships',
    'documents',
    'document_files',
    'actions',
    'jobs',
  ];
  const count = async () =>
    Object.fromEntries(
      await Promise.all(
        kept.map(async (t) => [t, (await query(`SELECT count(*)::int AS n FROM ${t}`))[0].n]),
      ),
    );
  const before = await count();
  assert.ok(before.users > 0 && before.documents > 0 && before.jobs > 0);
  const [doc] = await query(
    "SELECT id,title,created_at FROM documents WHERE title<>'Nouveau courrier' LIMIT 1",
  );
  const [job] = await query('SELECT id,payload FROM jobs LIMIT 1');
  // Sauvegarde quotidienne : une par jour, rangée dans le stockage.
  const name = await backupOnce();
  assert.equal(name, backupName());
  assert.ok((await listBackups()).includes(name));
  assert.equal(await backupMaybe(), null);
  const bytes = await getBackup(name);
  // Chiffrée : aucune adresse email lisible, et toute altération est détectée.
  assert.equal(bytes.includes(Buffer.from('alpha@example.test')), false);
  const tampered = Buffer.from(bytes);
  tampered[tampered.length - 1] ^= 1;
  await assert.rejects(restoreDatabase(tampered));
  // Une base qui contient des comptes n'est jamais écrasée.
  await assert.rejects(restoreDatabase(bytes), /Base non vide/);
  await query('TRUNCATE users, workspaces CASCADE');
  assert.equal((await count()).documents, 0);
  const restored = await restoreDatabase(await exportDatabaseFrom(bytes));
  assert.deepEqual(await count(), before);
  assert.equal(restored.counts.users, before.users);
  const [after] = await query('SELECT title,created_at FROM documents WHERE id=$1', [doc.id]);
  assert.equal(after.title, doc.title);
  assert.equal(new Date(after.created_at).getTime(), new Date(doc.created_at).getTime());
  const [jobAfter] = await query('SELECT payload FROM jobs WHERE id=$1', [job.id]);
  assert.deepEqual(jobAfter.payload, job.payload);
  // Les sessions ne sont pas sauvegardées : tout le monde se reconnecte après une restauration.
  assert.equal((await query('SELECT count(*)::int AS n FROM sessions'))[0].n, 0);
  void exportDatabase;
});
const exportDatabaseFrom = async (bytes: Buffer) => bytes;
