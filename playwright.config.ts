import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';
export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROME_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH }
      : {},
  },
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      NEXT_DIST_DIR: '.next-e2e',
      APP_URL: 'http://localhost:3100',
      LOCAL_DEV: 'true',
      LOCAL_DB_PATH: ':memory:',
      LOCAL_STORAGE_PATH: '.data/e2e-files',
      DATABASE_URL: '',
      STORAGE_DRIVER: 'local',
      STORAGE_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      MISTRAL_API_KEY: '',
      OPENROUTER_API_KEY: '',
      RESEND_API_KEY: '',
      RESEND_INBOUND_ENABLED: 'false',
      MEM0_API_KEY: '',
    },
  },
});
