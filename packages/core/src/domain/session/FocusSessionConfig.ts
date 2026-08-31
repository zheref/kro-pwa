/**
 * `SessionConfig` and its canonical presets — canon
 * `KroCore/Model/Session/Index.swift`.
 *
 * **Renamed to `FocusSessionConfig`.** The barrel already exports a
 * `SessionConfig` *class* from the legacy `/session` timer, which
 * `apps/web/src/app/session/page.tsx` constructs with `new SessionConfig(...)`.
 * Same rule as `FocusTimerMode`: disambiguate the incoming name.
 *
 * Beyond the name, three differences from that legacy class are deliberate:
 * this is a plain immutable value (no class, no `id` getter with an
 * `'Untitled'` fallback — canon's `id` **is** the title), its durations are
 * **seconds** rather than milliseconds, and `rest` is `null`-able rather than
 * defaulted to `0`, because canon distinguishes "no rest configured" from "a
 * rest of zero".
 */
import { hoursInSeconds, minutesInSeconds } from '../shared/TimeInterval'
import type { TimeIntervalSeconds } from '../shared/TimeInterval'
import { FocusTimerMode } from './FocusTimerMode'

/**
 * Canon's `SessionConfig.init` default for `duration` — `3.hours`. It applies
 * to **every** preset that does not name a duration, including the stopwatch
 * one: canon's `Open Space` is `.init(title: "Open Space", mode: .stopwatch)`,
 * so it carries this value rather than zero. That is not an accident — the
 * setup sheet can toggle Open Space back to countdown without losing a
 * configured fallback (`SessionLaunchRecommendation`'s doc comment says the
 * same thing about `targetDuration` under stopwatch).
 */
export const DEFAULT_SESSION_DURATION: TimeIntervalSeconds = hoursInSeconds(3)

/** Canon's `SessionConfig`. `id` is the title. */
export interface FocusSessionConfig {
  readonly title: string
  readonly duration: TimeIntervalSeconds
  /** `null` when no rest period is configured — not the same as a rest of 0. */
  readonly rest: TimeIntervalSeconds | null
  readonly mode: FocusTimerMode
}

/** `SessionConfig(title:duration:rest:mode:)`, carrying every canon default. */
export const makeFocusSessionConfig = (params: {
  readonly title: string
  readonly duration?: TimeIntervalSeconds
  readonly rest?: TimeIntervalSeconds | null
  readonly mode?: FocusTimerMode
}): FocusSessionConfig => ({
  title: params.title,
  duration: params.duration ?? DEFAULT_SESSION_DURATION,
  rest: params.rest ?? null,
  mode: params.mode ?? FocusTimerMode.countdown,
})

/** `var id: String { title }`. */
export const focusSessionConfigId = (config: FocusSessionConfig): string =>
  config.title

/** `SessionConfig.previewSession` — 60 seconds. Not one of the presets. */
export const previewSessionConfig: FocusSessionConfig = makeFocusSessionConfig({
  title: 'Preview Session',
  duration: 60,
})

/** `SessionConfig.testSession` — 2 minutes. Not one of the presets. */
export const testSessionConfig: FocusSessionConfig = makeFocusSessionConfig({
  title: 'Test Session',
  duration: minutesInSeconds(2),
})

/** `SessionConfig.quickFocus` — 5 minutes, no rest. */
export const quickFocusConfig: FocusSessionConfig = makeFocusSessionConfig({
  title: 'Quick Focus',
  duration: minutesInSeconds(5),
})

/** `SessionConfig.defaultPomodoro` — 25 + 5. */
export const defaultPomodoroConfig: FocusSessionConfig = makeFocusSessionConfig(
  {
    title: 'Pomodoro',
    duration: minutesInSeconds(25),
    rest: minutesInSeconds(5),
  },
)

/** `Focus` — 50 + 10. */
export const focusConfig: FocusSessionConfig = makeFocusSessionConfig({
  title: 'Focus',
  duration: minutesInSeconds(50),
  rest: minutesInSeconds(10),
})

/** `Momentum` — 75 + 15. */
export const momentumConfig: FocusSessionConfig = makeFocusSessionConfig({
  title: 'Momentum',
  duration: minutesInSeconds(75),
  rest: minutesInSeconds(15),
})

/** `Headspace` — 3 hours + 60 minutes. */
export const headspaceConfig: FocusSessionConfig = makeFocusSessionConfig({
  title: 'Headspace',
  duration: hoursInSeconds(3),
  rest: minutesInSeconds(60),
})

/**
 * `Open Space` — the stopwatch preset. Canon names no duration, so it inherits
 * `DEFAULT_SESSION_DURATION` (3 hours) and no rest.
 */
export const openSpaceConfig: FocusSessionConfig = makeFocusSessionConfig({
  title: 'Open Space',
  mode: FocusTimerMode.stopwatch,
})

/** `SessionConfig.defaultPresets` — the six, in canon order. */
export const defaultSessionPresets: readonly FocusSessionConfig[] = [
  quickFocusConfig,
  defaultPomodoroConfig,
  focusConfig,
  momentumConfig,
  headspaceConfig,
  openSpaceConfig,
]
