import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
// Restauration dans une base vide et migrée :
//   npm run db:restore            → liste les sauvegardes disponibles
//   npm run db:restore -- db-2026-11-10.bin
// Une base qui contient déjà des comptes est refusée : rien n'est écrasé.
async function main() {
  const { restoreDatabase, loadBackup } = await import('../src/lib/backup');
  const { listBackups } = await import('../src/lib/storage');
  const { migrate, database } = await import('../src/lib/db');
  const name = process.argv[2];
  if (!name) {
    const all = await listBackups();
    console.log(all.length ? `Sauvegardes disponibles :\n${all.join('\n')}` : 'Aucune sauvegarde.');
    return;
  }
  await migrate();
  const result = await restoreDatabase(await loadBackup(name));
  await (await database()).close();
  console.log(`Restauration terminée (sauvegarde du ${result.createdAt}).`);
  for (const [table, n] of Object.entries(result.counts)) console.log(`  ${table} : ${n}`);
}
main().catch((e) => {
  console.error('Restauration échouée :', e instanceof Error ? e.message : e);
  process.exit(1);
});
