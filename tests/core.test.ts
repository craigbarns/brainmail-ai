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
import { migrate, query, database } from '../src/lib/db';
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
import { validateFile, getFile } from '../src/lib/storage';
import { dateSchema, analyze, ocr, recallMemory, type Analysis } from '../src/lib/providers';
let temp: string, jpg: Buffer, a: { cookie: string; ws: string }, b: { cookie: string; ws: string };
const output: Analysis = {
  title: 'Avis de cotisation',
  category: 'Assurance',
  sender: 'Assureur test',
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
test('contrat OCR et LLM : sorties validées et date sans citation supprimée', async () => {
  const old = globalThis.fetch;
  process.env.MISTRAL_API_KEY = 'test-only';
  process.env.OPENROUTER_API_KEY = 'test-only';
  process.env.OPENROUTER_MODEL = 'test/model';
  try {
    globalThis.fetch = async (input, init) => {
      const b = JSON.parse(init!.body as string);
      if (String(input).includes('mistral')) {
        assert.equal(b.document.type, 'image_url');
        return Response.json({ pages: [{ markdown: 'Texte test' }] });
      }
      assert.equal(b.response_format.type, 'json_schema');
      assert.equal(b.provider.data_collection, 'deny');
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
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
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
