/**
 * Canned `FindState` variants and the endeavor fixtures behind them (`RC-31`,
 * `UZF-18`).
 *
 * Every test in this feature reads its state from here — a `State` is never
 * constructed inline, so the set of situations the two browsing surfaces claim
 * to support is enumerable in one file, and `#30`'s stories will consume the
 * same variants the reducer tests do.
 *
 * All times are built from `FIND_REFERENCE_NOW`, a fixed local instant, so
 * nothing here depends on when the suite runs. The fixtures deliberately span
 * every axis the surfaces filter on — kind, host, status, archived, due band —
 * because a grouping or filter assertion is only worth something against a set
 * that can actually be split.
 */
import type { Endeavor } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  makeEndeavor,
  makePerform,
  PerformResolution,
} from '@kro/core'
import { FindExceptions } from './FindException'
import type { EndeavorIntent } from './FindOperations'
import type { FindState, FindSurfaceState } from './FindState'
import { initialFindState } from './FindState'

/** A fixed Thursday morning. Every fixture below is relative to it. */
export const FIND_REFERENCE_NOW = new Date(2026, 5, 18, 9, 40, 0, 0)

/** `FIND_REFERENCE_NOW`'s calendar day at a given local hour and minute. */
export const findAt = (hour: number, minute = 0): Date =>
  new Date(2026, 5, 18, hour, minute, 0, 0)

/**
 * Seven endeavors spanning the axes the surfaces filter and group on.
 *
 * Names say what each one is *for*, because a grouping assertion reads far
 * better as "the morning task" than as "endeavor 3".
 */
export const findEndeavorMocks = {
  /** Task, local host, pending, due mid-morning. The ordinary row. */
  morningTask: makeEndeavor({
    id: 'task-morning',
    title: 'Prepare quarterly slides',
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    due: findAt(9, 0),
    createdAt: findAt(7, 0),
    hostedBy: [EndeavorHost.local],
  }),

  /** Task, Kro host, ongoing, due in the afternoon. */
  afternoonTask: makeEndeavor({
    id: 'task-afternoon',
    title: 'Review the auth flow PR',
    kind: EndeavorKind.task,
    status: EndeavorStatus.ongoing,
    due: findAt(14, 30),
    createdAt: findAt(8, 0),
    hostedBy: [EndeavorHost.supabase],
  }),

  /** Task on two hosts — the multi-host row the host filter must not hide. */
  mirroredTask: makeEndeavor({
    id: 'task-mirrored',
    title: 'File the expense report',
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    due: findAt(19, 15),
    createdAt: findAt(6, 30),
    hostedBy: [EndeavorHost.local, EndeavorHost.appleReminders],
  }),

  /** Task with no due date at all — the `anytime` band. */
  undatedTask: makeEndeavor({
    id: 'task-undated',
    title: 'Read the design doc',
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    createdAt: findAt(5, 0),
    hostedBy: [EndeavorHost.local],
  }),

  /** Closed task — invisible unless Show Archived is on. */
  archivedTask: makeEndeavor({
    id: 'task-archived',
    title: 'Renew the domain',
    kind: EndeavorKind.task,
    status: EndeavorStatus.closed,
    due: findAt(8, 0),
    completed: findAt(8, 30),
    createdAt: findAt(4, 0),
    hostedBy: [EndeavorHost.local],
  }),

  /** Calendar event — no due date by matrix, so it never defers. */
  teamSync: makeEndeavor({
    id: 'event-sync',
    title: 'Team sync',
    kind: EndeavorKind.calendarEvent,
    status: EndeavorStatus.planned,
    start: findAt(11, 0),
    duration: 3600,
    createdAt: findAt(3, 0),
    hostedBy: [EndeavorHost.googleCalendar],
  }),

  /** Habit — session-trackable, never due-dated. */
  stretch: makeEndeavor({
    id: 'habit-stretch',
    title: 'Stretch',
    kind: EndeavorKind.habit,
    status: EndeavorStatus.pending,
    createdAt: findAt(2, 0),
    hostedBy: [EndeavorHost.local],
    performances: [
      makePerform({
        date: findAt(7, 30),
        duration: 900,
        resolution: PerformResolution.finished,
        wasCompletedInSession: true,
        rewardPoints: 3,
      }),
    ],
  }),
} as const

/** Every fixture, in declaration order. */
export const allFindEndeavorMocks: readonly Endeavor[] =
  Object.values(findEndeavorMocks)

/**
 * Nine tasks in one status, so the seven-per-group display limit has something
 * to trim. Two beyond the limit is enough to prove both the cut and the count.
 */
export const nineOpenTasks: readonly Endeavor[] = Array.from(
  { length: 9 },
  (_unused, index) =>
    makeEndeavor({
      id: `task-bulk-${index}`,
      title: `Bulk task ${index}`,
      kind: EndeavorKind.task,
      status: EndeavorStatus.pending,
      due: findAt(9, index),
      createdAt: findAt(6, index),
      hostedBy: [EndeavorHost.local],
    }),
)

const loadedSurface = (
  base: FindSurfaceState,
  endeavors: readonly Endeavor[],
  enabledFlags: readonly string[] = [],
): FindSurfaceState => ({
  ...base,
  load: { kind: 'loaded' },
  endeavors,
  clockAnchor: FIND_REFERENCE_NOW,
  isLensRestored: true,
  enabledFlags,
})

const intent: EndeavorIntent = {
  id: 1,
  operation: 'startSession',
  endeavorId: findEndeavorMocks.morningTask.id,
  surface: 'find',
}

export const findStateMocks = {
  /** Nothing asked for yet. */
  idle: initialFindState,

  /** A read is in flight on Find. */
  loading: {
    ...initialFindState,
    find: { ...initialFindState.find, load: { kind: 'loading' } },
  } satisfies FindState as FindState,

  /** The typical loaded Find surface: every fixture, no filter touched. */
  loaded: {
    ...initialFindState,
    find: loadedSurface(initialFindState.find, allFindEndeavorMocks),
  } satisfies FindState as FindState,

  /** Loaded, with the `endeavorDetail` flag on — the tap binding exists. */
  loadedWithDetailFlag: {
    ...initialFindState,
    find: loadedSurface(initialFindState.find, allFindEndeavorMocks, [
      'endeavorDetail',
    ]),
  } satisfies FindState as FindState,

  /** Loaded but every kind, host and status hidden — canon's "No Filters Selected". */
  everythingHidden: {
    ...initialFindState,
    find: {
      ...loadedSurface(initialFindState.find, allFindEndeavorMocks),
      lens: {
        ...initialFindState.find.lens,
        hiddenKinds: [
          'task',
          'reminder',
          'calendarEvent',
          'habit',
          'background',
          'behavior',
          'blueprint',
        ],
        hiddenHosts: [
          'supabase',
          'local',
          'appleCalendar',
          'googleCalendar',
          'outlookCalendar',
          'appleReminders',
        ],
        hiddenStatuses: [
          'pending',
          'planned',
          'ongoing',
          'paused',
          'blocked',
          'delegated',
          'reviewing',
          'qa',
          'closed',
          'skipped',
        ],
      },
    },
  } satisfies FindState as FindState,

  /** Loaded, with a search that matches nothing — canon's "No Results". */
  searchWithNoMatches: {
    ...initialFindState,
    find: {
      ...loadedSurface(initialFindState.find, allFindEndeavorMocks),
      lens: { ...initialFindState.find.lens, searchQuery: 'zzzz' },
    },
  } satisfies FindState as FindState,

  /** The read failed, and the previously loaded rows are still shown. */
  failedAfterLoad: {
    ...initialFindState,
    find: {
      ...loadedSurface(initialFindState.find, allFindEndeavorMocks),
      load: {
        kind: 'failed',
        exception: FindExceptions.fetchFailed('offline'),
      },
    },
  } satisfies FindState as FindState,

  /** All Tasks loaded with the default vista and nine same-status rows. */
  tasksLoaded: {
    ...initialFindState,
    tasks: loadedSurface(initialFindState.tasks, nineOpenTasks),
  } satisfies FindState as FindState,

  /** All Tasks with one group expanded, so the limit is lifted. */
  tasksExpanded: {
    ...initialFindState,
    tasks: {
      ...loadedSurface(initialFindState.tasks, nineOpenTasks),
      expandedGroupKey: EndeavorStatus.pending,
    },
  } satisfies FindState as FindState,

  /** All Tasks over the mixed fixture set — several groups, several kinds. */
  tasksMixed: {
    ...initialFindState,
    tasks: loadedSurface(initialFindState.tasks, allFindEndeavorMocks),
  } satisfies FindState as FindState,

  /** One cross-feature request parked, awaiting the session surface. */
  withPendingIntent: {
    ...initialFindState,
    find: loadedSurface(initialFindState.find, allFindEndeavorMocks),
    intents: [intent],
    nextIntentId: 2,
  } satisfies FindState as FindState,
} as const
