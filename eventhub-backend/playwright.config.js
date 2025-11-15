// Playwright configuration for EventHub backend-hosted UI
// Runs the backend server and tests the client served statically at http://localhost:3000/

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000
  },
  testDir: 'tests/e2e'
};

module.exports = config;