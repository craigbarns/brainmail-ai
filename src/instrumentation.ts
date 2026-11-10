export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.LOCAL_DEV === 'true' &&
    process.env.NODE_ENV !== 'production'
  ) {
    const { migrate } = await import('./lib/db');
    await migrate();
    const g = globalThis as typeof globalThis & { brainWorker?: ReturnType<typeof setInterval> };
    if (!g.brainWorker) {
      const { workOnce } = await import('./lib/worker');
      let busy = false;
      g.brainWorker = setInterval(async () => {
        if (busy) return;
        busy = true;
        try {
          await workOnce();
        } catch {
          console.error('worker_cycle_failed');
        } finally {
          busy = false;
        }
      }, 3000);
    }
    // Reminders on their own clock, like the standalone worker.
    const g2 = globalThis as typeof globalThis & {
      brainReminders?: ReturnType<typeof setInterval>;
    };
    if (!g2.brainReminders) {
      const { remindersOnce, maintenanceMaybe } = await import('./lib/worker');
      g2.brainReminders = setInterval(async () => {
        try {
          await remindersOnce();
          await maintenanceMaybe();
        } catch {
          console.error('reminders_failed');
        }
      }, 60000);
    }
  }
}
