import { defineConfig, devices } from '@playwright/test';
if (!process.env.DATABASE_URL?.includes('/bella_validation_')) throw new Error('Execute E2E pelo runner de banco isolado do backend');
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 90_000,
  expect: { timeout: 20_000 }, reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3101', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'node ../chatbot-mvp/dist/index.js', url: 'http://127.0.0.1:3100/ready', reuseExistingServer: false, timeout: 60_000 },
    { command: 'npm run dev -- --hostname 127.0.0.1 --port 3101', url: 'http://127.0.0.1:3101/login', reuseExistingServer: false, timeout: 120_000, env: { NODE_ENV: 'development' } },
  ],
});
