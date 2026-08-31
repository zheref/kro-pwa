/**
 * `FocusSessionConfig` fixtures — `RC-13`.
 *
 * The canonical presets are **not** duplicated here: they are real values
 * exported from `FocusSessionConfig.ts`, and a fixture copy of them would rot
 * the moment canon changed one. These are the *other* shapes a config can
 * take — the ones a preset list never produces but the UI and the launch
 * policy still have to survive.
 */
import { hoursInSeconds, minutesInSeconds } from '../../shared/TimeInterval'
import {
  type FocusSessionConfig,
  defaultPomodoroConfig,
  makeFocusSessionConfig,
  openSpaceConfig,
  quickFocusConfig,
} from '../FocusSessionConfig'
import { FocusTimerMode } from '../FocusTimerMode'

export const focusSessionConfigMocks = {
  // ---------------------------------------------------------------- convenient

  /** The canonical 25 + 5, straight from the preset list. */
  pomodoro: defaultPomodoroConfig,

  /** The shortest preset: 5 minutes, no rest. */
  quickFocus: quickFocusConfig,

  /** The stopwatch preset — note it still carries the 3-hour default target. */
  openSpace: openSpaceConfig,

  // ------------------------------------------------------------------- neutral

  /** A user-authored countdown with no rest configured. */
  custom: makeFocusSessionConfig({
    title: 'Draft the brief',
    duration: minutesInSeconds(40),
  }),

  // -------------------------------------------------------------- inconvenient

  /**
   * Zero duration. Distinct from "no duration": the sliding scale reads a zero
   * target as the quick-complete case, and a dial has nothing to draw.
   */
  zeroDuration: makeFocusSessionConfig({
    title: 'Zero',
    duration: 0,
    rest: 0,
  }),

  /**
   * Rest **longer** than the focus period. Nothing forbids it, and a layout
   * that assumes rest is the smaller of the two breaks here.
   */
  restLongerThanFocus: makeFocusSessionConfig({
    title: 'Mostly Rest',
    duration: minutesInSeconds(5),
    rest: minutesInSeconds(45),
  }),

  /**
   * An empty title. `id` **is** the title in canon, so this fixture has an
   * empty identity — which is exactly what a keyed list has to survive.
   */
  untitled: makeFocusSessionConfig({
    title: '',
    duration: minutesInSeconds(30),
  }),

  /** A long, non-ASCII title and a 12-hour duration. */
  overlongUnicode: makeFocusSessionConfig({
    title:
      '🧘‍♀️ 長時間の集中セッション — a title nobody would type but the row still has to lay out',
    duration: hoursInSeconds(12),
    rest: minutesInSeconds(90),
    mode: FocusTimerMode.countdown,
  }),
} satisfies Record<string, FocusSessionConfig>

/** Every fixture, for suites asserting a property across the whole spread. */
export const allFocusSessionConfigMocks: readonly FocusSessionConfig[] =
  Object.values(focusSessionConfigMocks)
