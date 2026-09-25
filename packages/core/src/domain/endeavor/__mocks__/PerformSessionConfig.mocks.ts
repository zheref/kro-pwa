/**
 * Fixtures for `PerformSessionConfig` — the session configuration a recorded
 * fragment carries — with the `RC-13` spread of three convenient, one neutral
 * and three inconvenient variants. Each is checked with `satisfies`, so a
 * shape change fails here rather than widening silently.
 */
import type { PerformSessionConfig } from '../Perform'

export const performSessionConfigMocks = {
  /** Convenient: a 25-minute pomodoro with no rest — the default session. */
  countdown: {
    title: 'Prepare slides',
    duration: 1500,
    rest: null,
    mode: 'countdown',
  } satisfies PerformSessionConfig,
  /** Convenient: an open-ended stopwatch, with a five-minute rest after. */
  stopwatch: {
    title: 'Walk',
    duration: 0,
    rest: 300,
    mode: 'stopwatch',
  } satisfies PerformSessionConfig,
  /** Convenient: a countdown followed by a rest. */
  countdownWithRest: {
    title: 'Deep work',
    duration: 3000,
    rest: 600,
    mode: 'countdown',
  } satisfies PerformSessionConfig,
  /** Neutral: a countdown of zero seconds — nothing to count down. */
  zeroDuration: {
    title: 'Placeholder',
    duration: 0,
    rest: null,
    mode: 'countdown',
  } satisfies PerformSessionConfig,
  /** Inconvenient: a title far wider than any row. */
  longTitle: {
    title: 'Write the quarterly planning document '.repeat(6).trim(),
    duration: 2700,
    rest: null,
    mode: 'countdown',
  } satisfies PerformSessionConfig,
  /** Inconvenient: an empty title, as an anonymous session is recorded. */
  emptyTitle: {
    title: '',
    duration: 1200,
    rest: null,
    mode: 'countdown',
  } satisfies PerformSessionConfig,
  /** Inconvenient: a non-ASCII title (CJK and an emoji). */
  nonAsciiTitle: {
    title: '読書 📚 — café',
    duration: 900,
    rest: 120,
    mode: 'countdown',
  } satisfies PerformSessionConfig,
  /** Inconvenient: a 24-hour countdown with fractional seconds. */
  hugeDuration: {
    title: 'Marathon',
    duration: 86_400.5,
    rest: null,
    mode: 'countdown',
  } satisfies PerformSessionConfig,
}

export const allPerformSessionConfigMocks: readonly PerformSessionConfig[] =
  Object.values(performSessionConfigMocks)
