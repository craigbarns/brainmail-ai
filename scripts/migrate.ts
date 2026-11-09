import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
async function main() {
  const { migrate, database } = await import('../src/lib/db');
  await migrate();
  await (await database()).close();
  console.log('Migrations appliquées.');
}
main().catch(() => {
  console.error('Migration échouée. Vérifiez DATABASE_URL.');
  process.exit(1);
});
