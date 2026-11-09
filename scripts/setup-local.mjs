import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const env = `APP_URL=http://localhost:3000
LOCAL_DEV=true
STORAGE_DRIVER=local
STORAGE_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}
# Optional live services: add your own keys, never commit this file.
MISTRAL_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
RESEND_API_KEY=
RESEND_FROM=
MEM0_API_KEY=
RESEND_INBOUND_ENABLED=false
`;
try {
  await writeFile('.env.local', env, { flag: 'wx', mode: 0o600 });
  console.log('Configuration locale créée. Lancez npm run dev.');
} catch (e) {
  if (e.code === 'EEXIST') console.log('.env.local existe déjà, aucun changement.');
  else throw e;
}
