import { defineConfig } from '@playwright/test';
import * as fs from 'fs';

const AUTH_FILE = 'playwright-auth.json';
const AUTH_FILE_EXISTS = fs.existsSync(AUTH_FILE);

export default defineConfig({
  globalSetup: './src/scripts/global-setup',
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 1 : 2,
  
  
  reporter: [
    ['html', { outputFolder: 'playwright-report' , open: 'always' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list']
  ],

  timeout: 150000,

  use: {
    viewport: null,
    baseURL: process.env.BASE_URL || 'https://az-chem-synth.vercel.app/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // video: 'retain-on-failure',
    headless: false,
    // headless: !!process.env.CI,
    acceptDownloads: true,
    launchOptions: {
      args: ['--start-maximized'],
      // downloadsPath: './test-results/downloads',
    },

    // Load saved authentication state (for Microsoft MFA).
    // Only set when the file exists — otherwise the runner throws ENOENT
    // before globalSetup gets a chance to create it on first login.
    ...(AUTH_FILE_EXISTS ? { storageState: AUTH_FILE } : {}),
  },

  projects: [
    {
      name: 'chromium',
      use: { channel: 'chrome', viewport: null },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});