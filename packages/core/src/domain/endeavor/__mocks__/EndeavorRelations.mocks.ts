/**
 * Fixtures for the four nested models an `Endeavor` carries — `RepeatConfig`,
 * `Defer`, `Perform` (with `PerformFragment`) and `Shadow` — each with the
 * `RC-13` spread of three convenient, one neutral and three inconvenient
 * variants.
 *
 * They live in one file because they are one family: the relation types have
 * no life outside the endeavor that holds them, and a test that reaches for a
 * `Perform` almost always reaches for a `Shadow` in the same breath.
 */
import { Month } from '../../shared/Month'
import { WeekDay } from '../../shared/WeekDay'
import { type Defer, makeDefer } from '../Defer'
import { EndeavorKind } from '../EndeavorKind'
import {
  type Perform,
  type PerformFragment,
  PerformResolution,
  makePerform,
  makePerformFragment,
} from '../Perform'
import {
  type RepeatConfig,
  dailyBase,
  makeRepeatConfig,
  monthlyBase,
  weeklyBase,
  yearlyBase,
} from '../RepeatConfig'
import { type Shadow, makeShadow } from '../Shadow'

const at = (day: number, hour: number, minute = 0, month = 0): Date =>
  new Date(2026, month, day, hour, minute, 0)

// MARK: - RepeatConfig

export const repeatConfigMocks = {
  /** Convenient: every day. The simplest rule there is. */
  daily: makeRepeatConfig(dailyBase()),

  /** Convenient: the classic weekday habit. */
  weekdays: makeRepeatConfig(
    weeklyBase([
      WeekDay.monday,
      WeekDay.tuesday,
      WeekDay.wednesday,
      WeekDay.thursday,
      WeekDay.friday,
    ]),
  ),

  /** Convenient: the 1st of every month. */
  monthlyFirst: makeRepeatConfig(monthlyBase(1)),

  /** Neutral: a yearly rule on a mid-year date, no skipping. */
  yearlyMidYear: makeRepeatConfig(yearlyBase(3, Month.july)),

  /**
   * Inconvenient: an **empty** weekday set. Canon's codec accepts it, and it
   * means a weekly rule that never fires — a surface must not divide by the
   * count.
   */
  weeklyWithNoDays: makeRepeatConfig(weeklyBase([])),

  /**
   * Inconvenient: the 31st of every month, which does not exist in seven of
   * them, combined with an `everyOther` of 3.
   */
  monthlyThirtyFirst: makeRepeatConfig(monthlyBase(31), 3),

  /**
   * Inconvenient: 29 February — a date that exists one year in four — every
   * fourth year, so it lands only on leap years by construction.
   */
  leapDayEveryFourthYear: makeRepeatConfig(yearlyBase(29, Month.february), 4),
} satisfies Record<string, RepeatConfig>

export const allRepeatConfigMocks: readonly RepeatConfig[] =
  Object.values(repeatConfigMocks)

// MARK: - Defer

export const deferMocks = {
  /** Convenient: pushed one day, with a reason. */
  oneDayWithReason: makeDefer({
    made: at(12, 9, 0),
    reason: 'Waiting on the courier',
    target: at(13, 9, 0),
  }),

  /** Convenient: pushed to next week, with a reason. */
  nextWeek: makeDefer({
    made: at(12, 9, 0),
    reason: 'Out of office',
    target: at(19, 9, 0),
  }),

  /** Convenient: a short same-day slip of two hours. */
  laterToday: makeDefer({
    made: at(15, 9, 0),
    reason: 'Meeting overran',
    target: at(15, 11, 0),
  }),

  /** Neutral: no reason given — the field is genuinely optional. */
  noReason: makeDefer({ made: at(12, 9, 0), target: at(14, 9, 0) }),

  /**
   * Inconvenient: the target is **before** the moment the deferral was made,
   * which is a deferral into the past. Nothing rejects it; a surface must not
   * assume the interval is positive.
   */
  targetInThePast: makeDefer({
    made: at(15, 9, 0),
    reason: 'Rescheduled backwards by a sync',
    target: at(10, 9, 0),
  }),

  /** Inconvenient: made and target are the same instant — a zero-length defer. */
  zeroLength: makeDefer({
    made: at(15, 9, 0),
    reason: '',
    target: at(15, 9, 0),
  }),

  /** Inconvenient: a reason far longer than any caption, with emoji. */
  essayReason: makeDefer({
    made: at(15, 9, 0),
    reason: `${'I keep pushing this one and I would rather write down why than pretend otherwise. '.repeat(4)}🙃`,
    target: at(22, 9, 0),
  }),
} satisfies Record<string, Defer>

export const allDeferMocks: readonly Defer[] = Object.values(deferMocks)

// MARK: - PerformFragment

export const performFragmentMocks = {
  /** Convenient: a closed 25-minute fragment. */
  fullPomodoro: makePerformFragment({
    startedAt: at(15, 9, 0),
    endedAt: at(15, 9, 25),
  }),

  /** Convenient: a short closed fragment after a break. */
  shortSecondLeg: makePerformFragment({
    startedAt: at(15, 9, 30),
    endedAt: at(15, 9, 38),
  }),

  /** Convenient: a long closed fragment. */
  deepWork: makePerformFragment({
    startedAt: at(15, 13, 0),
    endedAt: at(15, 14, 30),
  }),

  /** Neutral: still running — `endedAt` is `null`, so duration is `null`. */
  running: makePerformFragment({ startedAt: at(15, 15, 0) }),

  /** Inconvenient: opened and closed in the same instant. */
  zeroLength: makePerformFragment({
    startedAt: at(15, 9, 0),
    endedAt: at(15, 9, 0),
  }),

  /** Inconvenient: `endedAt` precedes `startedAt` — a negative duration. */
  endsBeforeItStarts: makePerformFragment({
    startedAt: at(15, 9, 25),
    endedAt: at(15, 9, 0),
  }),

  /** Inconvenient: spans midnight, so start and end fall on different days. */
  acrossMidnight: makePerformFragment({
    startedAt: at(15, 23, 40),
    endedAt: at(16, 0, 20),
  }),
} satisfies Record<string, PerformFragment>

export const allPerformFragmentMocks: readonly PerformFragment[] =
  Object.values(performFragmentMocks)

// MARK: - Perform

export const performMocks = {
  /** Convenient: a completed 25-minute session that earned points. */
  completedPomodoro: makePerform({
    date: at(15, 9, 0),
    duration: 1500,
    notes: 'Clean run',
    resolution: PerformResolution.complete,
    sessionFragments: [performFragmentMocks.fullPomodoro],
    rewardPoints: 25,
    completedAt: at(15, 9, 25),
    wasCompletedInSession: true,
  }),

  /** Convenient: finished early but still counted. */
  finishedEarly: makePerform({
    date: at(14, 9, 0),
    duration: 900,
    resolution: PerformResolution.finished,
    sessionFragments: [performFragmentMocks.shortSecondLeg],
    rewardPoints: 12,
    completedAt: at(14, 9, 15),
    wasCompletedInSession: true,
  }),

  /** Convenient: a long two-fragment deep-work block. */
  twoFragmentDeepWork: makePerform({
    date: at(15, 13, 0),
    duration: 5400,
    notes: 'Split by a phone call',
    resolution: PerformResolution.complete,
    sessionFragments: [
      performFragmentMocks.deepWork,
      performFragmentMocks.shortSecondLeg,
    ],
    rewardPoints: 60,
    followUpNotes: 'Pick the thread back up tomorrow',
    completedAt: at(15, 14, 30),
    wasCompletedInSession: true,
  }),

  /** Neutral: recorded by hand, outside a session — every default in place. */
  manualEntry: makePerform({
    date: at(13, 16, 0),
    duration: 600,
    resolution: PerformResolution.complete,
  }),

  /**
   * Inconvenient: aborted after four minutes, no points, no completion stamp
   * — the shape an early bail-out leaves behind.
   */
  abortedEarly: makePerform({
    date: at(12, 9, 0),
    duration: 240,
    resolution: PerformResolution.aborted,
    sessionFragments: [performFragmentMocks.zeroLength],
    rewardPoints: 0,
  }),

  /**
   * Inconvenient: a **zero-duration** record that nevertheless claims to have
   * completed in a session — the combination canon's empirical-duration
   * filter exists to exclude.
   */
  zeroDurationInSession: makePerform({
    date: at(11, 9, 0),
    duration: 0,
    resolution: PerformResolution.complete,
    rewardPoints: 5,
    completedAt: at(11, 9, 0),
    wasCompletedInSession: true,
  }),

  /**
   * Inconvenient: a completion stamp that **precedes** the performance date,
   * plus negative reward points — neither is rejected by the type, so callers
   * must not assume otherwise.
   */
  inconsistentStamps: makePerform({
    date: at(10, 12, 0),
    duration: 3600,
    notes: 'Imported from a provider with a skewed clock',
    resolution: PerformResolution.finished,
    sessionFragments: [performFragmentMocks.endsBeforeItStarts],
    rewardPoints: -10,
    followUpNotes: '',
    completedAt: at(10, 11, 0),
    wasCompletedInSession: false,
  }),
} satisfies Record<string, Perform>

export const allPerformMocks: readonly Perform[] = Object.values(performMocks)

// MARK: - Shadow

export const shadowMocks = {
  /** Convenient: a Google Calendar event in a named calendar. */
  googleEvent: makeShadow({
    originalTitle: 'Cook Breakfast',
    sourceIdentifier: 'gcal-event-8891',
    kind: EndeavorKind.calendarEvent,
    source: 'googleCalendar',
    group: 'Personal',
  }),

  /** Convenient: an Apple reminder classified as a task, priority set. */
  appleTask: makeShadow({
    originalTitle: 'Renew passport',
    sourceIdentifier: 'reminders-x-4410',
    kind: EndeavorKind.task,
    source: 'appleReminders',
    group: 'Errands',
    appleReminderPriority: 1,
  }),

  /** Convenient: a daily Apple reminder, which canon always reads as a habit. */
  appleHabit: makeShadow({
    originalTitle: 'Morning Stretch',
    sourceIdentifier: 'reminders-x-9001',
    kind: EndeavorKind.habit,
    source: 'appleReminders',
    group: 'Health',
    appleReminderPriority: 0,
  }),

  /** Neutral: `Shadow.nothing` — the empty sentinel canon vends. */
  nothing: makeShadow({
    originalTitle: '',
    sourceIdentifier: '',
    kind: EndeavorKind.task,
    source: '',
    group: null,
  }),

  /**
   * Inconvenient: **no** `appleReminderPriority` at all. `null` is not `0`:
   * it means the shadow predates source-metadata persistence, so its stored
   * `kind` has to stand in.
   */
  legacyWithoutPriority: makeShadow({
    originalTitle: 'Collect paperwork',
    sourceIdentifier: 'reminders-x-0007',
    kind: EndeavorKind.reminder,
    source: 'appleReminders',
    group: null,
  }),

  /** Inconvenient: an unknown provider and an identifier that is only spaces. */
  unknownSource: makeShadow({
    originalTitle: 'Imported item',
    sourceIdentifier: '   ',
    kind: EndeavorKind.task,
    source: 'some-provider-we-have-never-heard-of',
    group: '',
  }),

  /** Inconvenient: a very long, non-ASCII title with a newline in it. */
  unicodeTitle: makeShadow({
    originalTitle: `会議の準備 — prepare for the review\nsecond line that should never have been in a title 🗂️`,
    sourceIdentifier: 'gcal-event-∆-771',
    kind: EndeavorKind.calendarEvent,
    source: 'googleCalendar',
    group: '仕事',
  }),
} satisfies Record<string, Shadow>

export const allShadowMocks: readonly Shadow[] = Object.values(shadowMocks)
