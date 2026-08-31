/**
 * `SessionTimerMode` — canon `KroCore/Model/Session/Index.swift`.
 *
 * **Renamed to `FocusTimerMode`.** The `@kro/core` barrel already exports a
 * `SessionTimerMode` *enum* from the legacy `/session` timer
 * (`model/Session/SessionConfig.ts`), which `apps/web` still imports. Two
 * exports of that name in one barrel is `TS2308`, so the incoming type takes
 * the product's own adjective for this loop — canon's `docs/Features/Session.md`
 * calls it a **focus session** throughout. This is #7's collision precedent
 * (`Perform.SessionFragment` → `PerformFragment`) applied with the same rule:
 * rename **only** where the barrel already holds the name, and leave every
 * other canon spelling untouched.
 */

/** Countdown vs stopwatch. Canon's two cases, raw values unchanged. */
export const FocusTimerMode = {
  /** A target duration counts down to zero. */
  countdown: 'countdown',
  /** Open-ended; elapsed time counts up and `targetDuration` is inert. */
  stopwatch: 'stopwatch',
} as const

export type FocusTimerMode =
  (typeof FocusTimerMode)[keyof typeof FocusTimerMode]

/** The cases in canon declaration order. */
export const focusTimerModes: readonly FocusTimerMode[] = [
  FocusTimerMode.countdown,
  FocusTimerMode.stopwatch,
]

/** Narrows a raw stored string, or `null` when it is not a known mode. */
export const focusTimerModeFromRawValue = (
  raw: string,
): FocusTimerMode | null => focusTimerModes.find((mode) => mode === raw) ?? null
