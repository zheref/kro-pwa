/**
 * `@kro/core` — the platform-free Kro domain tier.
 *
 * Nothing exported from here may reach for `react`, `next`, `react-dom` or a DOM
 * global: this package is compiled with `lib: ["ES2022"]` and `types: []`, and
 * `scripts/check-platform-free.mjs` fails `pnpm lint` if a platform import appears.
 */

export * from './model/Session/SessionConfig'
export * from './model/Session/SessionFragment'
export * from './model/Session/SessionTypes'
export * from './utils/durations'
