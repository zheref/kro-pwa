import { defineConfig } from 'vitest/config'

/**
 * `@kro/core` is the platform-free tier, so its suite runs on the plain Node
 * environment — no jsdom, no DOM globals. A test in this package that needs a
 * browser API is testing the wrong thing: that logic belongs in `@kro/app`.
 *
 * `globals: false` keeps `describe`/`it`/`expect` explicit imports, so the
 * package needs no ambient `types` entry and stays compilable with `types: []`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
  },
})
