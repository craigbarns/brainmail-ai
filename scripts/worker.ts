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
  // Reminders run on their own clock: a long analysis must never delay them.
  let reminderBusy = false;
  const reminderTimer = setInterval(() => {
    if (reminderBusy || stop) return;
    reminderBusy = true;
    remindersOnce()
      .then(() => maintenanceMaybe())
      .catch(() => console.error('reminders_failed'))
      .finally(() => {
        reminderBusy = false;
      });
  }, 60000);
  while (!stop) {
    try {
      const worked = await workOnce();
      if (!stop && !worked) await new Promise((r) => setTimeout(r, 2000));
    } catch {
      console.error('worker_cycle_failed');
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  clearInterval(reminderTimer);
  await (await database()).close();
}
main().catch(() => process.exit(1));
