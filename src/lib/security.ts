import {
  randomBytes,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
import { promisify } from 'node:util';
import { query } from './db';
const scrypt = promisify(scryptCallback);
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const secret = () => randomBytes(32).toString('base64url');
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  const result = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, 'hex');
  return expected.length === result.length && timingSafeEqual(expected, result);
}
export function originCheck(request: Request) {
  const origin = request.headers.get('origin');
  if (origin !== new URL(process.env.APP_URL || 'http://localhost:3000').origin)
    throw new HttpError(403, 'Origine de la requête refusée.');
}
export async function rateLimit(key: string, max: number, seconds = 900) {
  const rows = await query(
    `INSERT INTO rate_limits(key,count,resets_at) VALUES($1,1,now()+$2::int*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.resets_at<now() THEN 1 ELSE rate_limits.count+1 END,resets_at=CASE WHEN rate_limits.resets_at<now() THEN now()+$2::int*interval '1 second' ELSE rate_limits.resets_at END RETURNING count`,
    [hash(key), seconds],
  );
  if (rows[0].count > max) throw new HttpError(429, 'Trop de tentatives. Réessayez plus tard.');
}
function encryptionKey() {
  const key = Buffer.from(process.env.STORAGE_ENCRYPTION_KEY || '', 'base64');
  if (key.length !== 32)
    throw new Error('STORAGE_ENCRYPTION_KEY doit contenir 32 octets en base64.');
  return key;
}
export function encrypt(bytes: Buffer, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}
export function decrypt(bytes: Buffer, context: string) {
  const cipher = createDecipheriv('aes-256-gcm', encryptionKey(), bytes.subarray(0, 12));
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]);
}
export function cookiesOf(request: Request) {
  return Object.fromEntries(
    (request.headers.get('cookie') || '')
      .split(';')
      .map((s) => s.trim().split('='))
      .filter((x) => x.length === 2),
  );
}
export function cookie(name: string, value: string, path = '/', age = 604800) {
  return `${name}=${value}; Path=${path}; HttpOnly; SameSite=Strict; Max-Age=${age}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export async function limitedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, 'Fichier trop volumineux.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
