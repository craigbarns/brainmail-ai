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
  // The allowlist applies as soon as it is defined and non-empty; an empty
  // value means public sign-up. Undefined in production stays closed by default.
  const allowSetting = process.env.SIGNUP_EMAIL_ALLOWLIST;
  if (allowSetting) {
    const allow = allowSetting
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!allow.includes(email))
      throw new HttpError(403, 'Les inscriptions sont sur invitation pour cette version pilote.');
  } else if (process.env.NODE_ENV === 'production' && allowSetting === undefined) {
    throw new HttpError(403, 'Les inscriptions sont sur invitation pour cette version pilote.');
  }
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
  // Best effort : un échec de notification n'empêche jamais l'inscription.
  await notifyOwnerSignup(email, name).catch(() => undefined);
  return { id, token };
}
// Notification propriétaire : chaque nouvelle inscription est signalée
// immédiatement, sans jamais bloquer la création du compte en cas d'échec.
export async function notifyOwnerSignup(email: string, name: string) {
  const to = process.env.OWNER_NOTIFY_EMAIL;
  if (!to || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return;
  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM,
    to,
    subject: `🔔 Nouveau compte BRAINMAIL : ${email}`,
    text: `Nouvelle inscription sur BRAINMAIL.ai\n\nEmail : ${email}\nEspace : ${name}\nDate : ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}\n\nAccueil conseillé : rappelle-lui le code PILOTE (3 mois offerts) au paiement si tu veux le faire entrer en pilote.`,
  });
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
export async function requestPasswordReset(email: string) {
  const [user] = await query<{ id: string }>('SELECT id FROM users WHERE email=$1', [email]);
  if (!user) return false; // No account enumeration: the caller always answers the same.
  const token = secret();
  await transaction(async (db) => {
    // One live link at a time: a fresh request invalidates the previous one.
    await db.query('UPDATE password_resets SET used=true WHERE user_id=$1 AND used=false', [
      user.id,
    ]);
    await db.query(
      "INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '2 hours')",
      [user.id, hash(token)],
    );
  });
  return sendResetEmail(email, token);
}
export async function sendResetEmail(email: string, token: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return false;
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM,
    to: email,
    subject: 'Nouveau mot de passe BRAINMAIL',
    text: `Réinitialisez votre mot de passe (lien valable 2 heures) :\n${process.env.APP_URL}/login#reset=${token}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.`,
  });
  if (error) throw new HttpError(503, 'Service email indisponible. Réessayez plus tard.');
  return true;
}
export async function resetPassword(token: string, password: string) {
  const [row] = await query<{ user_id: string }>(
    'SELECT user_id FROM password_resets WHERE token_hash=$1 AND used=false AND expires_at>now()',
    [hash(token)],
  );
  if (!row) throw new HttpError(410, 'Lien expiré ou déjà utilisé. Demandez un nouveau lien.');
  const encoded = await passwordHash(password);
  await transaction(async (db) => {
    // Receiving the link proves ownership of the address: it counts as verification.
    await db.query('UPDATE users SET password_hash=$1,verified=true WHERE id=$2', [
      encoded,
      row.user_id,
    ]);
    await db.query('UPDATE password_resets SET used=true WHERE token_hash=$1', [hash(token)]);
    // Every session dies with the password: a stolen session cannot survive a reset.
    await db.query('DELETE FROM sessions WHERE user_id=$1', [row.user_id]);
  });
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
