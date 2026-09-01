/**
 * The Capture & Inbox feature's canned fixtures (`RC-31`, `UZF-18`).
 *
 * Three exports, and every suite in this folder consumes them rather than
 * building an endeavor, a draft or a `CaptureState` inline:
 *
 * - **`captureEndeavorFixtures`** — one endeavor per Inbox section and per
 *   boundary the canon selector cares about, positioned relative to
 *   `CAPTURE_MOCK_NOW`, which is a *fixed* instant. Whether a fixture is
 *   "unscheduled" is therefore a fact about the fixture, not about the day the
 *   suite happens to run.
 * - **`captureDraftFixtures`** — one draft per row of the validation truth
 *   table, so "what blocks Add" is stated once and asserted everywhere.
 * - **`captureStateMocks`** — the states the surface claims to support, each
 *   built by running the real Shifters. A mock assembled by hand could describe
 *   a state the reducer can never actually produce.
 *
 * `CAPTURE_MOCK_NOW` is **10:07**, deliberately: the next quarter-hour slot
 * (10:15) and the nearest one (10:00) differ there, so a fixture cannot pass a
 * test that confuses the Add-for-Today prefill with the prompt's own seed.
 */
import {
  type Endeavor,
  type EndeavorRecord,
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  endeavorRecordFromEndeavor,
  makeEndeavor,
} from '@kro/core'
import { type CaptureState, initialCaptureState } from './CaptureFeature'
import { CaptureExceptions } from './CaptureException'
import {
  ADD_FOR_TODAY_UNDO_WINDOW_MS,
  CaptureDestination,
  type CaptureDraft,
  CaptureKind,
  makeCaptureDraft,
  scheduledForToday,
  schedulingSnapshotOf,
} from './CaptureRules'
import {
  withAddForTodayRequested,
  withCaptureCommitted,
  withContextLoaded,
  withDateCleared,
  withException,
  withFetchStarted,
  withPromptOpened,
  withRouteDelivered,
  withSchedulingApplied,
  withTitleEdited,
  withUndoWindowChecked,
} from './CaptureShifters'

/** Tuesday 17 March 2026, 10:07 local. Every fixture below is relative to it. */
export const CAPTURE_MOCK_NOW = new Date(2026, 2, 17, 10, 7, 0)

/** A local wall-clock instant in March 2026 — the fixtures' only date builder. */
export const captureMockAt = (
  day: number,
  hour: number,
  minute = 0,
  second = 0,
): Date => new Date(2026, 2, day, hour, minute, second)

const endeavor = (params: {
  readonly id: string
  readonly title: string
  readonly kind?: EndeavorKind
  readonly status?: EndeavorStatus
  readonly start?: Date | null
  readonly due?: Date | null
  readonly duration?: number | null
  readonly completed?: Date | null
  readonly createdAt?: Date | null
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: params.kind ?? EndeavorKind.task,
    status: params.status ?? EndeavorStatus.pending,
    start: params.start ?? null,
    due: params.due ?? null,
    duration: params.duration ?? null,
    completed: params.completed ?? null,
    createdAt:
      params.createdAt === undefined ? CAPTURE_MOCK_NOW : params.createdAt,
    hostedBy: [EndeavorHost.local],
  })

/**
 * One endeavor per Inbox outcome. The comment on each names the section canon
 * puts it in at `CAPTURE_MOCK_NOW`; `__tests__/CaptureRules.test.ts` asserts
 * exactly that.
 */
export const captureEndeavorFixtures = {
  // --- Pending Triage: unscheduled, non-event, not done --------------------
  /** Captured five minutes ago — Pending Triage, and the newest of them. */
  freshTask: endeavor({
    id: 'fresh-task',
    title: 'Draft the announcement',
    createdAt: captureMockAt(17, 10, 2),
  }),
  /** Captured three weeks ago — still Pending Triage: there is no age bound. */
  neglectedTask: endeavor({
    id: 'neglected-task',
    title: 'Cancel the old subscription',
    createdAt: captureMockAt(2, 9, 0),
  }),
  /** A reminder with no schedule — Pending Triage: the filter is non-event. */
  unscheduledReminder: endeavor({
    id: 'unscheduled-reminder',
    title: 'Bring the parcel in',
    kind: EndeavorKind.reminder,
    createdAt: captureMockAt(16, 18, 0),
  }),
  /** A habit with no schedule — Pending Triage, for the same reason. */
  unscheduledHabit: endeavor({
    id: 'unscheduled-habit',
    title: 'Stretch for five minutes',
    kind: EndeavorKind.habit,
    createdAt: captureMockAt(15, 7, 30),
  }),
  /**
   * No `createdAt` at all — a legacy/import row. Pending Triage, sorted
   * **last**: canon deliberately does not gate on the timestamp, because the
   * user must still be able to find and triage it.
   */
  undatedLegacyTask: endeavor({
    id: 'undated-legacy-task',
    title: 'Imported from somewhere',
    createdAt: null,
  }),

  // --- Not Pending Triage --------------------------------------------------
  /** Has a due date — scheduled, so it is not awaiting triage. */
  scheduledTask: endeavor({
    id: 'scheduled-task',
    title: 'Call the bank',
    due: captureMockAt(17, 15, 0),
  }),
  /** Has a start but no due — still scheduled; the filter needs both absent. */
  startedTask: endeavor({
    id: 'started-task',
    title: 'Deep work block',
    start: captureMockAt(17, 13, 0),
  }),
  /** Closed this morning — `hasBeenCompleted`, so it leaves the section. */
  completedTask: endeavor({
    id: 'completed-task',
    title: 'Water the plants',
    status: EndeavorStatus.closed,
    completed: captureMockAt(17, 8, 0),
  }),
  /** Skipped — `hasBeenCompleted` counts it too, so it also leaves. */
  skippedTask: endeavor({
    id: 'skipped-task',
    title: 'Optional stretch goal',
    status: EndeavorStatus.skipped,
  }),
  /** A calendar event: excluded from every section, always. */
  eventToday: endeavor({
    id: 'event-today',
    title: 'Design review',
    kind: EndeavorKind.calendarEvent,
    start: captureMockAt(17, 14, 0),
    duration: 3600,
  }),
  /**
   * An unscheduled calendar event — the case the kind guard exists for. Even
   * with no start and no due it never reaches the Inbox.
   */
  unscheduledEvent: endeavor({
    id: 'unscheduled-event',
    title: 'Someday offsite',
    kind: EndeavorKind.calendarEvent,
  }),
} as const

/** The whole fixture pool, in one array — what a context load would install. */
export const captureFixturePool: readonly Endeavor[] = Object.values(
  captureEndeavorFixtures,
)

/**
 * The same pool as stored rows, for seeding a stubbed `LocalStore`.
 *
 * A Producer suite reads what the store holds, so the fixtures have to arrive
 * as records; going through the real codec is also what keeps the round-trip
 * honest rather than asserting against a hand-written row.
 */
export const captureFixtureRecords = (
  now: Date = CAPTURE_MOCK_NOW,
): readonly EndeavorRecord[] =>
  captureFixturePool.map((value) => endeavorRecordFromEndeavor(value, { now }))

// ---------------------------------------------------------------------------
// Drafts — the validation truth table, one row each
// ---------------------------------------------------------------------------

const draftOf = (
  kind: CaptureKind,
  edit: (draft: CaptureDraft) => CaptureDraft = (draft) => draft,
): CaptureDraft =>
  edit(
    makeCaptureDraft({
      kind,
      now: CAPTURE_MOCK_NOW,
      destination: CaptureDestination.local,
    }),
  )

export const captureDraftFixtures = {
  /** A fresh task prompt: no title yet, so Add is disabled. */
  emptyTask: draftOf(CaptureKind.task),
  /** Whitespace only — canon trims before it checks, so this is still empty. */
  whitespaceTask: draftOf(CaptureKind.task, (draft) => ({
    ...draft,
    title: '   \n ',
  })),
  /** Titled task, no time — valid: only events require times. */
  titledTask: draftOf(CaptureKind.task, (draft) => ({
    ...draft,
    title: 'Write the retro',
  })),
  /** Titled task with a committed time. */
  timedTask: draftOf(CaptureKind.task, (draft) => ({
    ...draft,
    title: 'Write the retro',
    hasTime: true,
  })),
  /**
   * Titled task, date cleared — `KC-IS-#75`: still valid (only events require
   * a date), and it is what submits a Task that lands in Pending Triage.
   */
  titledTaskNoDate: draftOf(CaptureKind.task, (draft) => ({
    ...draft,
    title: 'Sort the garage',
    hasDate: false,
  })),
  /** Titled reminder — valid without a time. */
  titledReminder: draftOf(CaptureKind.reminder, (draft) => ({
    ...draft,
    title: 'Bins out',
  })),
  /** Titled reminder, date cleared — the same dateless path, for a Reminder. */
  titledReminderNoDate: draftOf(CaptureKind.reminder, (draft) => ({
    ...draft,
    title: 'Ping the landlord',
    hasDate: false,
  })),
  /** Titled habit — valid, and its date is dropped on submission. */
  titledHabit: draftOf(CaptureKind.habit, (draft) => ({
    ...draft,
    title: 'Read ten pages',
  })),
  /** An event with a title and neither time — blocked on both. */
  eventMissingBothTimes: draftOf(CaptureKind.event, (draft) => ({
    ...draft,
    title: 'Team sync',
  })),
  /** An event with an end but no start — blocked on the start. */
  eventMissingStart: draftOf(CaptureKind.event, (draft) => ({
    ...draft,
    title: 'Team sync',
    hasEndTime: true,
  })),
  /** An event with a start but no end — blocked on the end. */
  eventMissingEnd: draftOf(CaptureKind.event, (draft) => ({
    ...draft,
    title: 'Team sync',
    hasTime: true,
  })),
  /** An event with both — the only shape that may be submitted. */
  completeEvent: draftOf(CaptureKind.event, (draft) => ({
    ...draft,
    title: 'Team sync',
    hasTime: true,
    hasEndTime: true,
  })),
  /** An untitled event with both times — the title still wins the report. */
  untitledCompleteEvent: draftOf(CaptureKind.event, (draft) => ({
    ...draft,
    hasTime: true,
    hasEndTime: true,
  })),
} as const

// ---------------------------------------------------------------------------
// States — each produced by the real Shifters
// ---------------------------------------------------------------------------

const loadedPool = withContextLoaded(initialCaptureState, {
  endeavors: captureFixturePool,
  lastUsedDestination: CaptureDestination.local,
  availableDestinations: [CaptureDestination.local],
  now: CAPTURE_MOCK_NOW,
})

const capturedTask = makeEndeavor({
  id: 'captured-task',
  title: 'Book the flights',
  kind: EndeavorKind.task,
  createdAt: CAPTURE_MOCK_NOW,
  hostedBy: [EndeavorHost.local],
})

const capturedEvent = makeEndeavor({
  id: 'captured-event',
  title: 'Team sync',
  kind: EndeavorKind.calendarEvent,
  start: captureMockAt(17, 16, 0),
  duration: 1800,
  createdAt: CAPTURE_MOCK_NOW,
  hostedBy: [EndeavorHost.local],
})

const afterTaskCapture = withCaptureCommitted(loadedPool, {
  endeavor: capturedTask,
  destination: CaptureDestination.local,
  now: CAPTURE_MOCK_NOW,
})

const scheduledAt = captureMockAt(17, 10, 15)
const schedulingTarget = captureEndeavorFixtures.freshTask
const scheduled = scheduledForToday(schedulingTarget, {
  scheduledAt,
  now: CAPTURE_MOCK_NOW,
})
const undoArmed = withSchedulingApplied(loadedPool, {
  endeavor: scheduled,
  snapshot: schedulingSnapshotOf(schedulingTarget, scheduledAt),
  now: CAPTURE_MOCK_NOW,
})

/**
 * The states the capture surface claims to support.
 *
 * Each is produced by the real Shifters, so a variant here is by construction a
 * state the reducer can actually reach.
 */
export const captureStateMocks = {
  /** Nothing asked for yet — first paint before the surface mounts. */
  idle: initialCaptureState,

  /** A read is in flight and nothing has landed. */
  loading: withFetchStarted(initialCaptureState),

  /** The ordinary pool: every section and every boundary represented. */
  loadedPool,

  /** A pool with nothing in it — the Inbox's true empty state. */
  loadedEmptyPool: withContextLoaded(initialCaptureState, {
    endeavors: [],
    lastUsedDestination: CaptureDestination.local,
    availableDestinations: [CaptureDestination.local],
    now: CAPTURE_MOCK_NOW,
  }),

  /** A load failed after a good pool was already showing. */
  failedLoadKeepingThePool: withException(
    loadedPool,
    CaptureExceptions.contextLoadFailed('the store is unavailable'),
  ),

  /** The prompt open on Task, untitled — Add disabled, reason reportable. */
  promptOpenOnTask: withPromptOpened(loadedPool, {
    kind: CaptureKind.task,
    now: CAPTURE_MOCK_NOW,
    initialStart: null,
  }),

  /** The prompt open on Task with a title typed — Add enabled. */
  promptReadyToSubmit: withTitleEdited(
    withPromptOpened(loadedPool, {
      kind: CaptureKind.task,
      now: CAPTURE_MOCK_NOW,
      initialStart: null,
    }),
    'Book the flights',
  ),

  /**
   * The prompt open on Task, titled, date cleared — `KC-IS-#75`: still valid
   * (only events require a date), and this IS the dateless-capture affordance
   * the date chip's Clear button unlocks.
   */
  promptTaskDateCleared: withDateCleared(
    withTitleEdited(
      withPromptOpened(loadedPool, {
        kind: CaptureKind.task,
        now: CAPTURE_MOCK_NOW,
        initialStart: null,
      }),
      'Sort the garage',
    ),
  ),

  /** The prompt open on Event with a title but no times — Add still disabled. */
  promptOpenOnEvent: withTitleEdited(
    withPromptOpened(loadedPool, {
      kind: CaptureKind.event,
      now: CAPTURE_MOCK_NOW,
      initialStart: null,
    }),
    'Team sync',
  ),

  /**
   * The prompt seeded from the Plan timeline's press-to-create: already
   * scheduled, so only the title is missing.
   */
  promptSeededFromTimeline: withPromptOpened(loadedPool, {
    kind: CaptureKind.event,
    now: CAPTURE_MOCK_NOW,
    initialStart: captureMockAt(17, 16, 0),
  }),

  /** A task captured; the Inbox route is decided but not yet delivered. */
  taskCapturedAwaitingInbox: afterTaskCapture,

  /** …and the same after the shell delivered it: the sheet is open. */
  inboxOpenWithJustCreated: withRouteDelivered(
    afterTaskCapture,
    new Date(CAPTURE_MOCK_NOW.getTime() + 500),
  ),

  /** An event captured: the Plan route is pending and the Inbox stays shut. */
  eventCapturedAwaitingPlan: withCaptureCommitted(loadedPool, {
    endeavor: capturedEvent,
    destination: CaptureDestination.local,
    now: CAPTURE_MOCK_NOW,
  }),

  /** The Add-for-Today popover open on a row, pre-filled with 10:15. */
  addForTodayOpen: withAddForTodayRequested(
    loadedPool,
    captureEndeavorFixtures.freshTask.id,
    CAPTURE_MOCK_NOW,
  ),

  /** A scheduling applied: Inbox dismissed, Plan routed, Undo armed. */
  undoArmed,

  /** …and the same window after it timed out. */
  undoExpired: withUndoWindowChecked(
    undoArmed,
    new Date(CAPTURE_MOCK_NOW.getTime() + ADD_FOR_TODAY_UNDO_WINDOW_MS),
  ),
}
