/**
 * The Do feature's canned fixtures (`RC-31`, `UZF-18`).
 *
 * Two exports, and every suite in this folder consumes them rather than
 * building a day or a `DoState` inline:
 *
 * - **`doEndeavorFixtures`** — one endeavor per lane and per boundary the
 *   canon doc and the Swift disagree about or leave implicit. They are
 *   positioned relative to `DO_MOCK_NOW`, which is a *fixed* instant, so the
 *   lane a fixture belongs to is a fact about the fixture rather than about
 *   the day the suite happens to run.
 * - **`doStateMocks`** — the states the surface claims to support, each built
 *   by running the real Shifters over those fixtures. A mock assembled by hand
 *   could describe a state the reducer can never actually produce.
 *
 * `DO_MOCK_NOW` is deliberately mid-morning: late enough for "earlier today"
 * to exist, early enough for "later today" to exist, so a single instant
 * exercises Overdue, Due Soon, Next and Anytime at once.
 */
import {
  type Endeavor,
  EndeavorHost,
  EndeavorKind,
  type EndeavorRecord,
  EndeavorStatus,
  PerformResolution,
  endeavorRecordFromEndeavor,
  makeEndeavor,
  makePerform,
} from '@kro/core'
import { type DoState, initialDoState } from './DoFeature'
import {
  withEndeavorsInstalled,
  withException,
  withFetchStarted,
  withMarkCompleteModeToggled,
  withSuggestionDismissed,
} from './DoShifters'
import { DoExceptions } from './DoException'
import { DoSuggestionSource } from './DoSuggestions'

/** Tuesday 17 March 2026, 10:00 local. Every fixture below is relative to it. */
export const DO_MOCK_NOW = new Date(2026, 2, 17, 10, 0, 0)

/** A local wall-clock instant in March 2026 — the fixtures' only date builder. */
export const doMockAt = (
  day: number,
  hour: number,
  minute = 0,
  second = 0,
): Date => new Date(2026, 2, day, hour, minute, second)

const task = (params: {
  readonly id: string
  readonly title: string
  readonly due?: Date | null
  readonly status?: EndeavorStatus
  readonly completed?: Date | null
  readonly kind?: EndeavorKind
  readonly duration?: number | null
  readonly sessionPoints?: number | null
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: params.kind ?? EndeavorKind.task,
    status: params.status ?? EndeavorStatus.pending,
    due: params.due ?? null,
    completed: params.completed ?? null,
    duration: params.duration ?? null,
    sessionPoints: params.sessionPoints ?? null,
    hostedBy: [EndeavorHost.local],
  })

/**
 * One endeavor per lane, plus every boundary worth pinning.
 *
 * The comment on each names the lane canon puts it in at `DO_MOCK_NOW`; the
 * table-driven suite in `__tests__/DoRules.test.ts` asserts exactly that.
 */
export const doEndeavorFixtures = {
  // --- Overdue: pending, due earlier today ---------------------------------
  /** Due 08:00 today — Overdue. */
  overdueThisMorning: task({
    id: 'overdue-morning',
    title: 'Send the invoice',
    due: doMockAt(17, 8, 0),
  }),
  /** Due one minute ago — still Overdue, not Due Soon. */
  overdueOneMinuteAgo: task({
    id: 'overdue-one-minute',
    title: 'Call the plumber',
    due: doMockAt(17, 9, 59),
  }),
  /** Due at 00:00 **today** — Overdue, because the due day is still today. */
  overdueAtMidnightToday: task({
    id: 'overdue-midnight-today',
    title: 'File yesterday’s notes',
    due: doMockAt(17, 0, 0),
  }),

  // --- Due Soon: due within the window, or ongoing -------------------------
  /** Due at exactly `now` — Due Soon: `isDueNow` is `due >= now`. */
  dueAtExactlyNow: task({
    id: 'due-exactly-now',
    title: 'Stand-up',
    due: doMockAt(17, 10, 0),
  }),
  /** Due in exactly two hours — Due Soon: the window is inclusive. */
  dueInExactlyTwoHours: task({
    id: 'due-two-hours',
    title: 'Prep the deck',
    due: doMockAt(17, 12, 0),
  }),
  /** Due one second past the window — Next, not Due Soon. */
  dueOneSecondPastWindow: task({
    id: 'due-past-window',
    title: 'Review the PR',
    due: doMockAt(17, 12, 0, 1),
  }),
  /** Ongoing with no due date — Due Soon's ongoing tail, never Anytime. */
  ongoingUndated: task({
    id: 'ongoing-undated',
    title: 'Draft the proposal',
    status: EndeavorStatus.ongoing,
  }),
  /** Ongoing and due tomorrow — still Due Soon, via the ongoing tail. */
  ongoingDueTomorrow: task({
    id: 'ongoing-due-tomorrow',
    title: 'Ship the migration',
    status: EndeavorStatus.ongoing,
    due: doMockAt(18, 9, 0),
  }),
  /**
   * Ongoing **and** overdue — the overlap. Overdue wins; the ongoing tail
   * excludes it explicitly, so it appears once, not twice.
   */
  ongoingAndOverdue: task({
    id: 'ongoing-overdue',
    title: 'Finish the audit',
    status: EndeavorStatus.ongoing,
    due: doMockAt(17, 8, 30),
  }),

  // --- Expired: pending, due yesterday or earlier --------------------------
  /** Due 23:59 yesterday — Expired one minute later, not Overdue. */
  expiredLastNight: task({
    id: 'expired-last-night',
    title: 'Renew the domain',
    due: doMockAt(16, 23, 59),
  }),
  /** Due a week ago — Expired. */
  expiredLastWeek: task({
    id: 'expired-last-week',
    title: 'Return the library book',
    due: doMockAt(10, 9, 0),
  }),

  // --- Next: due later today, beyond the window ----------------------------
  dueLateToday: task({
    id: 'due-late-today',
    title: 'Water the plants',
    due: doMockAt(17, 18, 0),
  }),

  // --- No lane at all ------------------------------------------------------
  /**
   * Due tomorrow morning — in **no** lane. Not Next (not today), not Anytime
   * (it has a due date). Canon's behaviour, and nowhere in the doc.
   */
  dueTomorrowMorning: task({
    id: 'due-tomorrow',
    title: 'Dentist',
    due: doMockAt(18, 9, 0),
  }),
  /** Due at 00:00 tomorrow — the other side of the midnight edge, so no lane. */
  dueAtMidnightTonight: task({
    id: 'due-midnight-tonight',
    title: 'Rollover the ledger',
    due: doMockAt(18, 0, 0),
  }),
  /**
   * Skipped, and was due this morning. `hasBeenCompleted` counts skipped, so
   * it leaves every actionable lane; Completed Today needs `closed`, so it
   * does not appear there either. It is in no lane.
   */
  skippedThisMorning: task({
    id: 'skipped-morning',
    title: 'Optional stretch goal',
    status: EndeavorStatus.skipped,
    due: doMockAt(17, 8, 0),
  }),

  // --- Anytime -------------------------------------------------------------
  anytimeTask: task({ id: 'anytime-task', title: 'Tidy the desk' }),

  // --- Habits --------------------------------------------------------------
  /** A habit due later this morning — Due Soon, and in the gold denominator. */
  habitDueSoon: task({
    id: 'habit-due-soon',
    title: 'Morning run',
    kind: EndeavorKind.habit,
    due: doMockAt(17, 11, 0),
  }),
  /** An undated habit — Anytime, and still one of today's habits. */
  habitUndated: task({
    id: 'habit-undated',
    title: 'Read ten pages',
    kind: EndeavorKind.habit,
  }),
  /** A habit completed this morning — Completed Today, and fills the gold ring. */
  habitCompletedToday: task({
    id: 'habit-completed',
    title: 'Meditate',
    kind: EndeavorKind.habit,
    status: EndeavorStatus.closed,
    completed: doMockAt(17, 7, 0),
  }),

  // --- Completed Today -----------------------------------------------------
  /** Closed today with a due date today — Completed Today, fills the emerald ring. */
  completedTodayTask: task({
    id: 'completed-today',
    title: 'Book the flights',
    status: EndeavorStatus.closed,
    due: doMockAt(17, 9, 0),
    completed: doMockAt(17, 9, 30),
  }),
  /** Closed yesterday — in no lane today, and in no ring. */
  completedYesterdayTask: task({
    id: 'completed-yesterday',
    title: 'Pay the electricity bill',
    status: EndeavorStatus.closed,
    due: doMockAt(16, 12, 0),
    completed: doMockAt(16, 12, 30),
  }),
  /**
   * Closed today with **no** host timestamp, carrying today's completion on a
   * performance instead — canon's fallback for a provider that advanced the
   * row before returning one.
   */
  completedTodayViaPerformance: makeEndeavor({
    id: 'completed-via-performance',
    title: 'Weekly review',
    kind: EndeavorKind.task,
    status: EndeavorStatus.closed,
    due: doMockAt(17, 8, 0),
    hostedBy: [EndeavorHost.local],
    performances: [
      makePerform({
        date: doMockAt(17, 8, 30),
        duration: 900,
        resolution: PerformResolution.complete,
        completedAt: doMockAt(17, 8, 45),
      }),
    ],
  }),

  // --- Other kinds ---------------------------------------------------------
  /** A reminder due today: outside every task lane, inside the emerald ring. */
  reminderDueToday: task({
    id: 'reminder-due-today',
    title: 'Bins out',
    kind: EndeavorKind.reminder,
    due: doMockAt(17, 20, 0),
  }),
  /** A reminder completed today — Completed Today, and fills the emerald ring. */
  reminderCompletedToday: task({
    id: 'reminder-completed',
    title: 'Take the vitamins',
    kind: EndeavorKind.reminder,
    status: EndeavorStatus.closed,
    due: doMockAt(17, 8, 0),
    completed: doMockAt(17, 8, 5),
  }),
  /** A calendar event: installed in its own channel, in no task lane and no ring. */
  eventToday: makeEndeavor({
    id: 'event-today',
    title: 'Design review',
    kind: EndeavorKind.calendarEvent,
    start: doMockAt(17, 14, 0),
    duration: 3600,
    hostedBy: [EndeavorHost.googleCalendar],
  }),

  // --- Scoring shapes ------------------------------------------------------
  /** Undated, not ongoing, no duration, no points — scores 0, so never featured. */
  zeroScoreTask: task({ id: 'zero-score', title: 'Someday, maybe' }),
  /** Undated but ongoing — scores 30, so it *is* featured. */
  ongoingZeroDueTask: task({
    id: 'ongoing-no-due',
    title: 'Ongoing chore',
    status: EndeavorStatus.ongoing,
  }),
  /** Due in four hours with a duration and rich reward — 25 + 10 + 5 + 3. */
  richUpcomingTask: task({
    id: 'rich-upcoming',
    title: 'Write the retro',
    due: doMockAt(17, 14, 0),
    duration: 1800,
    sessionPoints: 25,
  }),
} as const

/** The whole fixture day, in one array — what a fetch would install. */
export const doFixtureDay: readonly Endeavor[] =
  Object.values(doEndeavorFixtures)

/**
 * The same day as stored rows, for seeding a stubbed `LocalStore`.
 *
 * A Producer suite reads what the store holds, so the fixtures have to arrive
 * as records; going through the real codec is also what keeps the round-trip
 * honest rather than asserting against a hand-written row.
 */
export const doFixtureRecords = (
  now: Date = DO_MOCK_NOW,
): readonly EndeavorRecord[] =>
  doFixtureDay.map((endeavor) => endeavorRecordFromEndeavor(endeavor, { now }))

const loadedDay = withEndeavorsInstalled(
  initialDoState,
  doFixtureDay,
  DO_MOCK_NOW,
)

/**
 * The states the Do surface claims to support.
 *
 * Each is produced by the real Shifters, so a variant here is by construction
 * a state the reducer can actually reach.
 */
export const doStateMocks = {
  /** Nothing asked for yet — first paint before the surface mounts. */
  idle: initialDoState,

  /** A read is in flight and nothing has landed. */
  loading: withFetchStarted(initialDoState),

  /** The ordinary day: every lane populated, every boundary represented. */
  loadedTypicalDay: loadedDay,

  /** A day with nothing in it — the true empty state. */
  loadedEmptyDay: withEndeavorsInstalled(initialDoState, [], DO_MOCK_NOW),

  /**
   * A refresh failed **after** a good day was already showing. The lanes are
   * untouched, which is the whole reason `load` sits beside the day.
   */
  failedRefreshKeepingTheDay: withException(
    loadedDay,
    DoExceptions.fetchFailed('the store is unavailable'),
  ),

  /** Bulk mark-complete mode is on, so the rings hide. */
  inMarkCompleteMode: withMarkCompleteModeToggled(loadedDay),

  /** The rings' kill switch is on — the ordinary shipping configuration. */
  ringsEnabled: {
    ...loadedDay,
    preferences: { ...loadedDay.preferences, activityRingsEnabled: true },
  } satisfies DoState,

  /** Auto-advance turned on by the user; otherwise the ordinary day. */
  autoAdvanceEnabled: {
    ...loadedDay,
    preferences: { ...loadedDay.preferences, autoAdvanceAfterComplete: true },
  } satisfies DoState,

  /** Google Calendar offerable and unlinked — the connect nudge is showing. */
  suggestionOffered: {
    ...loadedDay,
    preferences: { ...loadedDay.preferences, googleCalendarEnabled: true },
    suggestions: [
      {
        source: DoSuggestionSource.googleCalendar,
        title: 'Google Calendar',
        subtitle: 'See all your events in one place.',
        actionTitle: 'Connect',
      },
    ],
  } satisfies DoState,

  /** …and the same day once the user has turned that nudge down. */
  suggestionDismissed: withSuggestionDismissed(
    {
      ...loadedDay,
      preferences: { ...loadedDay.preferences, googleCalendarEnabled: true },
    },
    DoSuggestionSource.googleCalendar,
  ),
}
