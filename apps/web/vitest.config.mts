import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Unit / component test runner for `@kro/web`.
 *
 * Replaces the Jest + ts-jest setup: same jsdom environment, same module
 * aliases, same Testing Library assertions. Playwright owns `e2e/` and is
 * excluded here so `vitest run` never tries to drive a browser.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors `paths` in tsconfig.json.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Workspace packages are consumed as TypeScript source (see
      // `transpilePackages` in next.config.ts); point Vitest at the same
      // entry the bundler resolves.
      '@kro/core': fileURLToPath(
        new URL('../../packages/core/src/index.ts', import.meta.url),
      ),
      // Subpath exports come FIRST: a string alias matches by prefix, so the
      // bare `@kro/app` entry below would otherwise rewrite `@kro/app/google`
      // to `…/src/index.ts/google`. Mirrors `exports` in
      // `packages/app/package.json`, which is what Next and tsc resolve
      // through. (KC-IS-#33)
      '@kro/app/google': fileURLToPath(
        new URL(
          '../../packages/app/src/services/googleCalendar/index.ts',
          import.meta.url,
        ),
      ),
      '@kro/app/design': fileURLToPath(
        new URL('../../packages/app/src/design/index.ts', import.meta.url),
      ),
      '@kro/app': fileURLToPath(
        new URL('../../packages/app/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**', 'e2e/**'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
    },
  },
})
