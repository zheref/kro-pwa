import { defineConfig } from 'vitest/config'

/**
 * `@kro/app` holds the store, the typed hooks and the feature slices, so its
 * suite runs under jsdom: a headless hook still needs a React renderer.
 *
 * `globals: false` keeps `describe`/`it`/`expect` explicit imports, so the
 * package needs no ambient `types` entry and stays compilable with `types: []`.
 *
 * No network transport is configured anywhere in this project on purpose — every
 * suite reaches a Service only through a stubbed binding injected into
 * `makeStore(extra)` (`RC-35`).
 *
 * COVERAGE (KC-IS-#50). `make test` stays instrumentation-free — the floor is
 * a per-PR measurement, not a per-run tax — and `pnpm --filter @kro/app
 * test:coverage` is the verb that measures it. The exclusions are the repo's
 * own DoD list, so the printed number is the number the DoD asks about: the
 * `*.stories.tsx` files ARE the `UZF-26`/`RC-11` evidence rather than code
 * under test, `__mocks__` and `<F>Mocks.ts` are fixtures, `__tests__/`
 * harnesses are scaffolding, and an `index.ts` barrel is a pure re-export.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: [
        'src/**/*.stories.tsx',
        'src/**/__mocks__/**',
        'src/**/__tests__/**',
        'src/**/*Mocks.ts',
        'src/**/index.ts',
      ],
    },
  },
})
