/**
 * `@kro/core` — the platform-free Kro domain tier.
 *
 * Nothing exported from here may reach for `react`, `next`, `react-dom` or a DOM
 * global: this package is compiled with `lib: ["ES2022"]` and `types: []`, and
 * `scripts/check-platform-free.mjs` fails `pnpm lint` if a platform import appears.
 *
 * Layout:
 *   `library/`  the UZF runtime primitives every feature sits on — `Result`,
 *               `Exception`, `assertNever` (`RC-7`, `RC-8`, `RC-9`).
 *   `domain/`   the Kro domain proper, ported from KroApple's `KroCore`:
 *               `endeavor/` (the `Endeavor` value type, its enums, the
 *               `RepeatConfig` codec, the kind-relevance matrix and the pure
 *               `with…` helpers) and `shared/` (the vocabulary the rest of the
 *               domain and the Triage/Earn/Auth features share).
 *   `models/`   domain models, their `…Exception` unions and Mappers, plus the
 *               `__mocks__` spread each model ships (`RC-13`, exported under the
 *               `@kro/core/mocks` subpath so production bundles never pull them).
 *
 * The store, the typed hooks and the feature slices live in `@kro/app`: they need
 * `react-redux`, which would breach this package's platform-free contract. See
 * the PR for #5 for that interpretation of `RC-50`.
 */

export * from './domain/endeavor'
// #8 — the focus-session domain. Anchored right after `domain/endeavor`
// because it builds on it (`Perform`, `PerformResolution`, `Endeavor`) and
// nothing points back. Its three renamed types (`FocusTimerMode`,
// `FocusSessionConfig`, `FocusSessionFragment`) exist to keep this barrel free
// of the `TS2308` collisions the legacy `model/Session/*` exports below would
// otherwise cause — see `domain/session/index.ts` for the rule.
export * from './domain/session'
export * from './domain/shared'
export * from './library/assertNever'
export * from './library/exception'
export * from './library/result'
export * from './model/Session/SessionConfig'
export * from './model/Session/SessionFragment'
export * from './model/Session/SessionTypes'
export * from './models/Greeting'
export * from './models/GreetingException'
export * from './models/GreetingMapper'
export * from './models/GreetingResponse'
export * from './utils/durations'
