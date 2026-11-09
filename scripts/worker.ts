import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
async function main() {
  const { workOnce, remindersOnce, maintenanceMaybe } = await import('../src/lib/worker');
  const { database } = await import('../src/lib/db');
  let stop = false;
  process.on('SIGTERM', () => {
    stop = true;
  });
  process.on('SIGINT', () => {
    stop = true;
  });
  let lastReminder = 0;
  while (!stop) {
    try {
      const worked = await workOnce();
      if (Date.now() - lastReminder > 60000) {
        await remindersOnce();
        await maintenanceMaybe();
        lastReminder = Date.now();
      }
      if (!worked) await new Promise((r) => setTimeout(r, 2000));
    } catch {
      console.error('worker_cycle_failed');
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  await (await database()).close();
}
main().catch(() => process.exit(1));
