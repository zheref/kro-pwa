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

// --- vistas (#9) -----------------------------------------------------------
// The Vista system: the declarative registry that gives every endeavor-listing
// surface its query, its user-mutable lens, its ordered row capabilities and
// its presentation. Appended as a block rather than folded into the sorted list
// above so a parallel child appending after the `domain/` exports and this one
// never contend for the same line.
export * from './vistas'

// --- settings & flags (#11) ------------------------------------------------
// `settings/` is the preference schema ported from canon's `SettingOptions`:
// every option's key, value shape, glyph, default and sync scope, the five
// groups, the cloud-sync subset, the stored-value codec and the narrow
// key-value port #10's persistence satisfies. `flags/` is the `UZF-22` central
// registry: all 28 declared flags, the `statusQuoSet` baseline, the
// last-match-wins override service and the flag × preference AND-ing helper.
//
// Appended after the vistas block for the same reason that block exists — a
// parallel child appends its own block below rather than contending for a line
// in the sorted list above. `flags/` imports from `settings/`
// (`FeatureFlagGating` needs the two session options canon AND's), so the order
// here is also the dependency order.
export * from './settings'
export * from './flags'

// --- source reconciliation & Kro-enhanced (#12) ----------------------------
// The host-agnostic reconciliation pass: logical identity, the transitive
// linker, field-scoped ownership on conflict, the pluggable per-provider
// classification tables (Apple's ships as data), and the citizen / tourist /
// enhanced model with its promotion and integrity rules. Runs before
// filtering, grouping or presentation — see `Reconcile.ts`.
//
// Appended as its own block, after `vistas`, for the same anti-contention
// reason that block gives. #12's own comment asked that it stay last if a
// settings/flags block landed first; merging `main` into this branch is that
// moment, so the two blocks sit in the order both asked for.
export * from './domain/reconciliation'
