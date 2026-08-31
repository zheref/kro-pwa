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
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
