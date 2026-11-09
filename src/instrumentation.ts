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
      const { workOnce, remindersOnce } = await import('./lib/worker');
      let busy = false;
      g.brainWorker = setInterval(async () => {
        if (busy) return;
        busy = true;
        try {
          await workOnce();
          await remindersOnce();
        } catch {
          console.error('worker_cycle_failed');
        } finally {
          busy = false;
        }
      }, 3000);
    }
  }
}
