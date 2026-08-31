/**
 * `domain/session` — the focus-session domain, ported from KroApple's
 * `KroCore/Model/Session/*`, `Kro/Domain/RewardCalculator.swift` and the
 * `SessionSetupFeature`/`SessionSetupShifters` pair, against
 * `zheref/KroApple@2c1ee45`.
 *
 * Pure values and pure functions only: no timers, no storage, no side effects
 * (`RC-24`). Producers wire the clock and the anchor file later — the running
 * session's persistence is #10, and the feature slice that drives all of this
 * is #21.
 *
 * ## Unit vocabulary — settled here (#8's issue comment)
 *
 * **Seconds are the canonical `TimeInterval`, everywhere in this domain.**
 * Every `duration`, `targetDuration`, `rest`, `elapsedDuration`,
 * `remainingDuration`, threshold and fragment span below is a
 * `TimeIntervalSeconds` (`domain/shared/TimeInterval`), and matches the number
 * Swift would encode for the same value.
 *
 * This settles the inconsistency tracked on #8: `utils/durations.ts` — moved
 * as-is during the monorepo restructure — has helpers named `seconds()` /
 * `minutes()` that return **milliseconds**, under docstrings that describe
 * milliseconds while the names say otherwise. Nothing in `domain/` imports
 * that module: #7 introduced `TimeIntervalSeconds` with the unit spelled into
 * the type name precisely so a reader never has to guess, and this port speaks
 * only that vocabulary.
 *
 * The legacy helpers themselves stay for now. Their behaviour is locked by the
 * `useSession` / `useSessionTimer` suites in `apps/web`, they are outside this
 * issue's file lane, and #21 — which rebuilds those two hooks on this domain —
 * is the change that removes their last caller and can retire them in the same
 * PR that proves nothing still needs them.
 *
 * ## Names that had to change, and the rule
 *
 * Three canon names already exist in the `@kro/core` barrel, exported by the
 * legacy `/session` timer under `model/Session/` and imported today by
 * `apps/web`. A second export of any of them is `TS2308`, so the incoming type
 * is the one that moves — #7's precedent (`Perform.SessionFragment` →
 * `PerformFragment`), applied by the same rule: **rename only where the barrel
 * already holds the name; keep canon's spelling everywhere else.**
 *
 * | Canon | Here | Because |
 * |---|---|---|
 * | `SessionTimerMode` | `FocusTimerMode` | legacy `enum SessionTimerMode` |
 * | `SessionConfig` | `FocusSessionConfig` | legacy `class SessionConfig` |
 * | `SessionFragment` | `FocusSessionFragment` | legacy `interface SessionFragment` **and** `PerformFragment` |
 *
 * `PersistedRunningSession`, `PersistedSessionEndeavor`,
 * `PersistedSessionPhase`, `SessionSummary`, `SessionLaunchRecommendation` and
 * `PointsFormula` collide with nothing and keep canon's spelling exactly. The
 * adjective is the product's own: `docs/Features/Session.md` says "focus
 * session" and "focus performances" throughout.
 */

export * from './FocusSessionConfig'
export * from './FocusSessionFragment'
export * from './FocusTimerMode'
export * from './PersistedRunningSession'
export * from './PointsFormula'
export * from './RewardCalculator'
export * from './SessionLaunchRecommendation'
export * from './SessionSummary'
export * from './SessionThreshold'
export * from './SessionTransitions'
