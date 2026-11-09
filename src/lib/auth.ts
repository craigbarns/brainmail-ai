import { randomUUID } from 'node:crypto';
import { query, transaction } from './db';
import { cookiesOf, hash, HttpError, secret, passwordHash, verifyPassword } from './security';
import { Resend } from 'resend';
export type Identity = {
  userId: string;
  workspaceId: string;
  email: string;
  verified: boolean;
  role: string;
};
export async function authenticate(request: Request): Promise<Identity> {
  const token = cookiesOf(request).brainmail;
  if (!token) throw new HttpError(401, 'Connectez-vous pour continuer.');
  const [s] = await query(
    `SELECT s.user_id,s.workspace_id,u.email,u.verified,m.role FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=s.user_id AND m.workspace_id=s.workspace_id WHERE s.token_hash=$1 AND s.expires_at>now()`,
    [hash(token)],
  );
  if (!s) throw new HttpError(401, 'Session expirée.');
  return {
    userId: s.user_id,
    workspaceId: s.workspace_id,
    email: s.email,
    verified: s.verified,
    role: s.role,
  };
}
export async function register(email: string, password: string, name: string) {
  const allow = (process.env.SIGNUP_EMAIL_ALLOWLIST || '').toLowerCase().split(',');
  if (process.env.NODE_ENV === 'production' && !allow.includes(email))
    throw new HttpError(403, 'Les inscriptions sont sur invitation pour cette version pilote.');
  const id = randomUUID(),
    workspace = randomUUID(),
    token = secret();
  const encoded = await passwordHash(password);
  await transaction(async (db) => {
    if ((await db.query('SELECT id FROM users WHERE email=$1', [email])).rows.length)
      throw new HttpError(409, 'Ce compte existe déjà. Connectez-vous.');
    await db.query('INSERT INTO users(id,email,password_hash,verified) VALUES($1,$2,$3,$4)', [
      id,
      email,
      encoded,
      process.env.LOCAL_DEV === 'true' && process.env.NODE_ENV !== 'production',
    ]);
    await db.query('INSERT INTO workspaces(id,name) VALUES($1,$2)', [workspace, name]);
    await db.query('INSERT INTO memberships(user_id,workspace_id) VALUES($1,$2)', [id, workspace]);
    await db.query(
      "INSERT INTO verification_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '24 hours')",
      [hash(token), id],
    );
  });
  return { id, token };
}
export async function sendVerification(email: string, token: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return false;
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM,
    to: email,
    subject: 'Vérifiez votre compte BRAINMAIL',
    text: `Vérifiez votre adresse : ${process.env.APP_URL}/login#verify=${token}`,
  });
  if (error)
    throw new HttpError(
      503,
      'Compte créé. Le service de vérification email est indisponible. Réessayez depuis la connexion.',
    );
  return true;
}
export async function login(email: string, password: string) {
  const [user] = await query('SELECT * FROM users WHERE email=$1', [email]);
  // Execute a password derivation even for unknown accounts.
  const valid = await verifyPassword(
    password,
    user?.password_hash || '00000000000000000000000000000000:' + '00'.repeat(64),
  );
  if (!user || !valid) throw new HttpError(401, 'Email ou mot de passe incorrect.');
  if (!user.verified) throw new HttpError(403, 'Vérifiez votre email avant de vous connecter.');
  const [membership] = await query(
    'SELECT workspace_id FROM memberships WHERE user_id=$1 ORDER BY workspace_id LIMIT 1',
    [user.id],
  );
  const token = secret();
  await query(
    "INSERT INTO sessions(token_hash,user_id,workspace_id,expires_at) VALUES($1,$2,$3,now()+interval '7 days')",
    [hash(token), user.id, membership.workspace_id],
  );
  return token;
}
