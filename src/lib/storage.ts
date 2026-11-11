import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { encrypt, decrypt, HttpError } from './security';
export const MAX_FILE = 15 * 1024 * 1024;
export async function validateFile(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_FILE)
    throw new HttpError(413, 'Maximum : 15 Mo par fichier.');
  if (bytes.subarray(0, 5).toString() === '%PDF-') {
    try {
      const doc = await PDFDocument.load(bytes);
      if (doc.getPageCount() > 20 || doc.getPageCount() < 1) throw new Error();
    } catch {
      throw new HttpError(415, 'PDF illisible, protégé ou contenant plus de 20 pages.');
    }
    return { bytes, mime: 'application/pdf' };
  }
  try {
    const img = sharp(bytes, { limitInputPixels: 40_000_000 });
    const meta = await img.metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format || '')) throw new Error();
    // Decode and re-encode, remove metadata including GPS and normalize mobile orientation.
    return {
      bytes: await img
        .rotate()
        .resize({ width: 2400, height: 3200, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer(),
      mime: 'image/jpeg',
    };
  } catch {
    throw new HttpError(415, 'Format accepté : PDF, JPEG, PNG ou WebP.');
  }
}
function s3() {
  return new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}
function localPath(key: string) {
  if (!/^[a-f0-9-]+\/[a-f0-9-]+\/[a-f0-9-]+$/.test(key))
    throw new Error('Clé de stockage invalide');
  return path.join(/*turbopackIgnore: true*/ process.env.LOCAL_STORAGE_PATH || '.data/files', key);
}
function local() {
  if (process.env.STORAGE_DRIVER === 'local' && process.env.NODE_ENV !== 'production') return true;
  if (!process.env.S3_BUCKET || !process.env.S3_ENDPOINT)
    throw new HttpError(503, 'Stockage privé non configuré.');
  return false;
}
export async function putFile(key: string, bytes: Buffer) {
  const encrypted = encrypt(bytes, key);
  if (local()) {
    const p = localPath(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, encrypted, { mode: 0o600 });
  } else
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: encrypted,
        ContentType: 'application/octet-stream',
      }),
    );
}
export async function getFile(key: string) {
  if (local()) return decrypt(await readFile(/*turbopackIgnore: true*/ localPath(key)), key);
  const r = await s3().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  return decrypt(Buffer.from(await r.Body!.transformToByteArray()), key);
}
export async function deleteFile(key: string) {
  if (local()) await unlink(localPath(key)).catch(() => {});
  else await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
}
// Database backups live under their own prefix, already encrypted by the caller.
const BACKUP_PREFIX = 'backups/';
function backupKey(name: string) {
  if (!/^db-\d{4}-\d{2}-\d{2}\.bin$/.test(name)) throw new Error('Nom de sauvegarde invalide');
  return BACKUP_PREFIX + name;
}
const localBackup = (name: string) =>
  path.join(
    /*turbopackIgnore: true*/ process.env.LOCAL_STORAGE_PATH || '.data/files',
    backupKey(name),
  );
export async function putBackup(name: string, bytes: Buffer) {
  if (local()) {
    const p = localBackup(name);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, bytes, { mode: 0o600 });
  } else
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: backupKey(name),
        Body: bytes,
        ContentType: 'application/octet-stream',
      }),
    );
}
export async function getBackup(name: string) {
  if (local()) return readFile(/*turbopackIgnore: true*/ localBackup(name));
  const r = await s3().send(
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: backupKey(name) }),
  );
  return Buffer.from(await r.Body!.transformToByteArray());
}
export async function listBackups(): Promise<string[]> {
  const valid = (n: string) => /^db-\d{4}-\d{2}-\d{2}\.bin$/.test(n);
  if (local()) {
    const dir = path.dirname(localBackup('db-0000-00-00.bin'));
    return (await readdir(dir).catch(() => [] as string[])).filter(valid).sort();
  }
  const r = await s3().send(
    new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET, Prefix: BACKUP_PREFIX }),
  );
  return (r.Contents || [])
    .map((o) => (o.Key || '').slice(BACKUP_PREFIX.length))
    .filter(valid)
    .sort();
}
export async function deleteBackup(name: string) {
  if (local()) await unlink(localBackup(name)).catch(() => {});
  else
    await s3().send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: backupKey(name) }),
    );
}
