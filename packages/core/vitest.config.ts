import { defineConfig } from 'vitest/config'

/**
 * `@kro/core` is the platform-free tier, so its suite runs on the plain Node
 * environment — no jsdom, no DOM globals. A test in this package that needs a
 * browser API is testing the wrong thing: that logic belongs in `@kro/app`.
 *
 * `globals: false` keeps `describe`/`it`/`expect` explicit imports, so the
 * package needs no ambient `types` entry and stays compilable with `types: []`.
 *
 * COVERAGE (KC-IS-#50). `make test` stays instrumentation-free — the floor is
 * a per-PR measurement, not a per-run tax — and `pnpm --filter @kro/core
 * test:coverage` is the verb that measures it. The provider, the reporters and
 * the `include` glob are configured here rather than passed on the command
 * line so the number a PR quotes and the number CI would compute come from one
 * place. `src/**` rather than the default (touched files only): a file with no
 * test at all is exactly what the floor is meant to catch, and the default
 * would report it as absent rather than as 0%.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      // Mocks and pure re-export barrels are exempt from the floor by the
      // repo's own DoD; excluding them here keeps the printed number the
      // number the DoD is asking about.
      exclude: ['src/**/__mocks__/**', 'src/**/index.ts', 'src/mocks.ts'],
    },
  },
})
