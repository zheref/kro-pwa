/**
 * Canned `PlanState` variants and the day fixtures behind them (`RC-31`,
 * `UZF-18`).
 *
 * Every test in this feature reads its state from here — a `State` is never
 * constructed inline, so the set of situations the Plan surface claims to
 * support is enumerable in one file, and #19's stories will consume the same
 * variants the reducer tests do.
 *
 * ## The day fixtures are canon's own
 *
 * `TimelineDayPreviewData` in `KroUI/Plan/TimelineDayView.swift` carries the
 * overlap shapes the layout was tuned against — a long solo block, a long block
 * with short events nested inside it, two overlapping long blocks, a dense
 * cluster. Those four are reproduced here as `planDayFixtures`, because the
 * golden-layout assertions are only worth anything if they are laid out against
 * the same shapes canon was.
 *
 * All times are built from `PLAN_REFERENCE_DAY`, a fixed local date, so nothing
 * in this file depends on when the suite runs.
 */
import type { Endeavor } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  makeEndeavor,
  makeShadow,
} from '@kro/core'
import { planDayKey, startOfPlanDay } from './PlanCalendar'
import type { PlanDayCache } from './PlanDayCache'
import type { TimelineEditSession } from './PlanEditSession'
import { PlanExceptions } from './PlanException'
import { PlanViewMode } from './PlanNavigation'
import type { PlanState } from './PlanState'
import { initialPlanState } from './PlanState'

/** A fixed Thursday, so weekday-sensitive rules land on a known day. */
export const PLAN_REFERENCE_DAY = new Date(2026, 5, 18, 0, 0, 0, 0)

/** `PLAN_REFERENCE_DAY` at a given local hour and minute. */
export const planAt = (hour: number, minute = 0): Date => {
  const at = startOfPlanDay(PLAN_REFERENCE_DAY)
  at.setHours(hour, minute, 0, 0)
  return at
}

/** The reference day's wall clock, mid-morning. */
export const PLAN_REFERENCE_NOW = planAt(9, 40)

const event = (params: {
  readonly id: string
  readonly title: string
  readonly start: Date
  readonly durationSeconds: number
  readonly status?: (typeof EndeavorStatus)[keyof typeof EndeavorStatus]
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: EndeavorKind.calendarEvent,
    status: params.status ?? EndeavorStatus.planned,
    start: params.start,
    duration: params.durationSeconds,
    hostedBy: [EndeavorHost.local],
  })

const task = (params: {
  readonly id: string
  readonly title: string
  readonly due: Date | null
  readonly value: number | null
  readonly status?: (typeof EndeavorStatus)[keyof typeof EndeavorStatus]
  readonly ticket?: boolean
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: EndeavorKind.task,
    status: params.status ?? EndeavorStatus.pending,
    due: params.due,
    value: params.value,
    hostedBy: [EndeavorHost.local],
    shadows: params.ticket
      ? [
          makeShadow({
            originalTitle: params.title,
            sourceIdentifier: `jira-${params.id}`,
            kind: EndeavorKind.task,
            source: 'jira',
          }),
        ]
      : null,
  })

/**
 * The overlap shapes canon's previews use, reproduced. Each is named for the
 * layout question it answers.
 */
export const planDayFixtures = {
  /** Nothing scheduled — the empty canvas. */
  empty: [] as readonly Endeavor[],

  /** One block, no overlap: column 0 of 1, full width. */
  longSoloBlock: [
    event({
      id: 'solo-standup',
      title: 'Deep work',
      start: planAt(9),
      durationSeconds: 3 * 3600,
    }),
  ] as readonly Endeavor[],

  /**
   * The nested case the issue names explicitly: two short events sitting
   * **inside** a long one. Each must get its own column so all three are
   * independently interactive.
   */
  longBlockWithShortOverlaps: [
    event({
      id: 'nested-long',
      title: 'Offsite',
      start: planAt(9),
      durationSeconds: 4 * 3600,
    }),
    event({
      id: 'nested-short-a',
      title: 'Standup',
      start: planAt(9, 30),
      durationSeconds: 900,
    }),
    event({
      id: 'nested-short-b',
      title: 'One-on-one',
      start: planAt(11),
      durationSeconds: 1800,
    }),
  ] as readonly Endeavor[],

  /** Two long blocks that overlap in the middle — two columns throughout. */
  overlappingLongBlocks: [
    event({
      id: 'overlap-a',
      title: 'Design review',
      start: planAt(10),
      durationSeconds: 2 * 3600,
    }),
    event({
      id: 'overlap-b',
      title: 'Vendor call',
      start: planAt(11),
      durationSeconds: 2 * 3600,
    }),
  ] as readonly Endeavor[],

  /** Three mutually-overlapping events — a three-column cluster. */
  denseOverlapCluster: [
    event({
      id: 'dense-a',
      title: 'Planning',
      start: planAt(13),
      durationSeconds: 3600,
    }),
    event({
      id: 'dense-b',
      title: 'Interview',
      start: planAt(13, 15),
      durationSeconds: 3600,
    }),
    event({
      id: 'dense-c',
      title: 'Escalation',
      start: planAt(13, 30),
      durationSeconds: 3600,
    }),
  ] as readonly Endeavor[],

  /**
   * Two clusters separated by a gap, plus a 10-minute event that must still
   * render at the 30 px minimum.
   */
  fullDayLongAndShort: [
    event({
      id: 'morning-block',
      title: 'Focus',
      start: planAt(8),
      durationSeconds: 2 * 3600,
    }),
    event({
      id: 'tiny-sync',
      title: 'Sync',
      start: planAt(15),
      durationSeconds: 600,
    }),
    event({
      id: 'evening-block',
      title: 'Retro',
      start: planAt(16),
      durationSeconds: 3600,
    }),
  ] as readonly Endeavor[],

  /** One event that has already finished by `PLAN_REFERENCE_NOW`. */
  pastEvent: [
    event({
      id: 'past-breakfast',
      title: 'Breakfast',
      start: planAt(7),
      durationSeconds: 1800,
    }),
  ] as readonly Endeavor[],

  /** An event that spans midnight into the reference day. */
  spillingFromYesterday: [
    event({
      id: 'overnight-run',
      title: 'Overnight build',
      start: planAt(-2),
      durationSeconds: 5 * 3600,
    }),
  ] as readonly Endeavor[],
} as const

/** Task-shaped rows covering every quadrant plus the inadmissible kinds. */
export const planMatrixFixtures = {
  /** due today, value 5 → Prioritize. */
  urgentImportant: task({
    id: 'matrix-prioritize',
    title: 'File the tax return',
    due: planAt(17),
    value: 5,
  }),
  /** due in three days, value 4 → Schedule. */
  futureImportant: task({
    id: 'matrix-decide',
    title: 'Draft the roadmap',
    due: new Date(planAt(9).getTime() + 3 * 86_400_000),
    value: 4,
  }),
  /** due today, value 2 → Delegate. */
  urgentLowImpact: task({
    id: 'matrix-delegate',
    title: 'Book the courier',
    due: planAt(18),
    value: 2,
  }),
  /** due next week, value 1 → Archive. */
  futureLowImpact: task({
    id: 'matrix-delete',
    title: 'Tidy the bookmarks',
    due: new Date(planAt(9).getTime() + 7 * 86_400_000),
    value: 1,
  }),
  /** A ticket — admitted, same as a task. */
  ticket: task({
    id: 'matrix-ticket',
    title: 'KC-18 plan logic',
    due: planAt(16),
    value: 5,
    ticket: true,
  }),
  /** No value: untriaged, so it belongs to no quadrant. */
  missingValue: task({
    id: 'matrix-no-value',
    title: 'Think about the thing',
    due: planAt(16),
    value: null,
  }),
  /** No due date: likewise untriaged. */
  missingDue: task({
    id: 'matrix-no-due',
    title: 'Someday, maybe',
    due: null,
    value: 5,
  }),
  /** Completed: excluded whatever it resolves to. */
  completed: task({
    id: 'matrix-done',
    title: 'Renew the passport',
    due: planAt(11),
    value: 5,
    status: EndeavorStatus.closed,
  }),
  /** A calendar event: never admitted. */
  calendarEvent: event({
    id: 'matrix-event',
    title: 'Dentist',
    start: planAt(14),
    durationSeconds: 1800,
  }),
  /** A habit: never admitted, even carrying a due date and a value. */
  habit: makeEndeavor({
    id: 'matrix-habit',
    title: 'Stretch',
    kind: EndeavorKind.habit,
    due: planAt(20),
    value: 5,
    hostedBy: [EndeavorHost.local],
  }),
  /** A reminder: never admitted. */
  reminder: makeEndeavor({
    id: 'matrix-reminder',
    title: 'Call mum',
    kind: EndeavorKind.reminder,
    due: planAt(19),
    value: 4,
    hostedBy: [EndeavorHost.local],
  }),
} as const

/** Every matrix fixture in one array, for the exhaustive admission tests. */
export const planMatrixFixtureList: readonly Endeavor[] = Object.values(
  planMatrixFixtures,
)

const referenceDayKey = planDayKey(PLAN_REFERENCE_DAY)

/** A buffer holding the two days either side of the reference day. */
export const planPreloadedDaysFixture: PlanDayCache = {
  [planDayKey(new Date(PLAN_REFERENCE_DAY.getTime() - 86_400_000))]: [
    event({
      id: 'yesterday-review',
      title: 'Yesterday review',
      start: new Date(planAt(10).getTime() - 86_400_000),
      durationSeconds: 3600,
    }),
  ],
  [planDayKey(new Date(PLAN_REFERENCE_DAY.getTime() + 86_400_000))]: [
    event({
      id: 'tomorrow-demo',
      title: 'Tomorrow demo',
      start: new Date(planAt(15).getTime() + 86_400_000),
      durationSeconds: 3600,
    }),
  ],
}

/** An armed, untouched edit session for the nested long block. */
export const planEditSessionFixture: TimelineEditSession = {
  endeavorId: 'nested-long',
  originalStart: planAt(9),
  originalEnd: planAt(13),
  draftStart: null,
  draftEnd: null,
  drag: null,
}

const loadedBase: PlanState = {
  ...initialPlanState,
  now: PLAN_REFERENCE_NOW,
  selectedDate: startOfPlanDay(PLAN_REFERENCE_DAY),
  dayPickerCenter: startOfPlanDay(PLAN_REFERENCE_DAY),
  isQuickEventCreationEnabled: true,
}

export const planStateMocks = {
  /** Nothing asked for yet — first paint before the surface mounts. */
  idle: initialPlanState,

  /** The clock and day are stamped; the first read is in flight. */
  loading: {
    ...loadedBase,
    dayLoad: { kind: 'loading', dayKey: referenceDayKey },
    activity: { isRefreshing: false, isAppLoading: true, preloadCenterDayKey: null },
  } satisfies PlanState,

  /** The ordinary loaded day: one long block with two short ones inside it. */
  loaded: {
    ...loadedBase,
    dayLoad: {
      kind: 'loaded',
      dayKey: referenceDayKey,
      events: planDayFixtures.longBlockWithShortOverlaps,
    },
  } satisfies PlanState,

  /** Loaded, with the −3…+3 buffer installed around it. */
  loadedWithPreload: {
    ...loadedBase,
    dayLoad: {
      kind: 'loaded',
      dayKey: referenceDayKey,
      events: planDayFixtures.longBlockWithShortOverlaps,
    },
    preloadedDays: planPreloadedDaysFixture,
    preloadedCenterDayKey: referenceDayKey,
  } satisfies PlanState,

  /** A day with nothing on it — the empty canvas. */
  loadedEmptyDay: {
    ...loadedBase,
    dayLoad: { kind: 'loaded', dayKey: referenceDayKey, events: [] },
  } satisfies PlanState,

  /** Loaded, with a card armed for editing. */
  editing: {
    ...loadedBase,
    dayLoad: {
      kind: 'loaded',
      dayKey: referenceDayKey,
      events: planDayFixtures.longBlockWithShortOverlaps,
    },
    editSession: planEditSessionFixture,
  } satisfies PlanState,

  /** Loaded, with an uncommitted quick-create ghost at 14:00. */
  quickCreating: {
    ...loadedBase,
    dayLoad: {
      kind: 'loaded',
      dayKey: referenceDayKey,
      events: planDayFixtures.longSoloBlock,
    },
    quickCreate: { start: planAt(14), durationSeconds: 3600 },
  } satisfies PlanState,

  /** The matrix destination, with every quadrant represented. */
  matrix: {
    ...loadedBase,
    viewMode: PlanViewMode.priorityMatrix,
    matrixLoad: { kind: 'loaded', endeavors: planMatrixFixtureList },
  } satisfies PlanState,

  /** Recoverable failure — the surface offers a retry. */
  failed: {
    ...loadedBase,
    dayLoad: {
      kind: 'failed',
      dayKey: referenceDayKey,
      exception: PlanExceptions.dayLoadFailed('store unavailable'),
    },
  } satisfies PlanState,

  /** All three load kinds in flight at once — the activity signal's worst case. */
  everythingLoading: {
    ...loadedBase,
    dayLoad: { kind: 'loading', dayKey: referenceDayKey },
    activity: {
      isRefreshing: true,
      isAppLoading: true,
      preloadCenterDayKey: referenceDayKey,
    },
  } satisfies PlanState,
}
