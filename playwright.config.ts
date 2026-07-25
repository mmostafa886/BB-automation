import { defineConfig } from '@playwright/test';

export default defineConfig({
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

  timeout: 80000,

  use: {
    viewport: null,
    baseURL: process.env.BASE_URL || 'https://stgapp.bznsbuilder.com/',
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