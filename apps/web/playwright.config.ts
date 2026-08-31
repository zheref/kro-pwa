import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

const STORYBOOK_PORT = Number(process.env.PLAYWRIGHT_STORYBOOK_PORT ?? 6007)
const STORYBOOK_URL =
  process.env.PLAYWRIGHT_STORYBOOK_URL ?? `http://localhost:${STORYBOOK_PORT}`

/**
 * End-to-end scaffolding for `@kro/web`.
 *
 * Run it with `pnpm --filter @kro/web test:e2e` after `pnpm exec playwright
 * install chromium` (the browser download is deliberately NOT part of `make
 * setup`). `pr.yml` does not run this suite yet: adding the browser install
 * step to CI is its own decision (cache size, runner minutes) and belongs to
 * the child that adds the first real E2E coverage.
 *
 * ## Two projects, because there are two things only a browser can answer
 *
 * - **`app`** drives the built product at `BASE_URL`.
 * - **`kit`** drives the DESIGN SYSTEM, through Storybook, because a kit
 *   component is not mounted anywhere in the app yet and some of its
 *   behaviours exist only in a real engine: CSS cascade layers (jsdom resolves
 *   none) and pointer capture (jsdom implements none). Both produced defects
 *   that shipped green — a fixed glass panel that laid out in flow, and a
 *   pointer capture that swallowed every tap on an in-row button. The specs in
 *   `e2e-kit/` are those two, held in the only place that can hold them.
 *
 * Storybook is already a devDependency and the stories already exist, so this
 * adds a server to boot and no dependency at all. It runs on 6007 rather than
 * Storybook's own 6006 so a developer's open gallery is never hijacked.
 */
export default defineConfig({
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'app',
      testDir: './e2e',
      use: { ...devices['Desktop Chrome'], baseURL: BASE_URL },
    },
    {
      name: 'kit',
      testDir: './e2e-kit',
      use: { ...devices['Desktop Chrome'], baseURL: STORYBOOK_URL },
    },
  ],
  webServer: [
    {
      command: `pnpm run dev --port ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // `--ci` is Storybook's own "do not open a browser"; `--quiet` keeps the
      // build log out of the test output.
      command: `pnpm exec storybook dev -p ${STORYBOOK_PORT} --ci --quiet`,
      url: `${STORYBOOK_URL}/iframe.html`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
})
