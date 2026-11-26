import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { ...devices['Pixel 7'], baseURL: 'http://127.0.0.1:5173' },
  webServer: [
    { command: '../../target/debug/unicourse-api', url: 'http://127.0.0.1:3001/api/schools' },
    {
      command: 'node ./node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173'
    }
  ]
});
