import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
// Sauvegarde immédiate de la base (en plus de la sauvegarde quotidienne du worker).
async function main() {
  const { backupOnce } = await import('../src/lib/backup');
  const { database } = await import('../src/lib/db');
  const name = await backupOnce();
  await (await database()).close();
  console.log(`Sauvegarde enregistrée : backups/${name}`);
}
main().catch((e) => {
  console.error('Sauvegarde échouée :', e instanceof Error ? e.message : e);
  process.exit(1);
});
