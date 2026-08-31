/**
 * The Triage feature's canned fixtures (`RC-31`, `UZF-18`).
 *
 * Four exports, and every suite in this folder consumes them rather than
 * building an endeavor, a day or a `TriageState` inline:
 *
 * - **`triageEndeavorFixtures`** — one endeavor per citizenship (citizen /
 *   tourist / enhanced), per kind whose field-relevance guard matters (habit,
 *   calendar event) and per prefill boundary the convenience seed cares about.
 * - **`triageDayFixtures`** — the local days the gap search runs against, so
 *   "the soonest gap big enough for 25 minutes" is a fact about a named day
 *   rather than about whichever endeavors a test happened to build.
 * - **`triageStateMocks`** — the states the surface claims to support, each
 *   built by running the **real** Shifters. A mock assembled by hand could
 *   describe a state the reducer can never actually produce.
 * - **`triageDecisionFixtures`** — one decision per branch of
 *   `applyTriageDecision`'s (due, duration) switch, plus the archive case.
 *
 * `TRIAGE_MOCK_NOW` is **Tuesday 17 March 2026, 10:07** — the same instant
 * `CAPTURE_MOCK_NOW` uses, so the two features' fixtures speak one calendar,
 * and deliberately off a quarter hour so the gap search's "round up to 10:15"
 * cannot be confused with "start at 10:07".
 *
 * The 17th is a **Tuesday**, which is what makes the EoW fixtures meaningful:
 * its calendar week (Sunday-start) runs 15–21 March, so EoW is Saturday the
 * 21st and a scheduled date on the 22nd lands in the *next* week.
 */
import {
  EisenhowerQuadrant,
  type Endeavor,
  EndeavorHost,
  EndeavorKind,
  type EndeavorRecord,
  EndeavorStatus,
  defaultTriageDurationOptionsMinutes,
  endeavorRecordFromEndeavor,
  makeEndeavor,
} from '@kro/core'
import { TriageExceptions } from './TriageException'
import { type TriageState, initialTriageState } from './TriageFeature'
import type { TriageDecision } from './TriageRules'
import {
  type TriageBusyInterval,
  triageBusyIntervalsFor,
} from './TriageScheduling'
import {
  withDurationPicked,
  withException,
  withFetchStarted,
  withOutcomeRaised,
  withQuadrantPicked,
  withSaveFailed,
  withSaveStarted,
  withSaved,
  withSessionOpened,
} from './TriageShifters'
import { TRIAGE_DEFAULT_SYMBOL, type TriageSessionSeed } from './TriageState'

/** Tuesday 17 March 2026, 10:07 local. Every fixture below is relative to it. */
export const TRIAGE_MOCK_NOW = new Date(2026, 2, 17, 10, 7, 0)

/** A local wall-clock instant in March 2026 — the fixtures' only date builder. */
export const triageMockAt = (
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
  readonly expiry?: Date | null
  readonly value?: number | null
  readonly effort?: number | null
  readonly sessionPoints?: number | null
  readonly hostedBy?: readonly EndeavorHost[]
}): Endeavor =>
  makeEndeavor({
    id: params.id,
    title: params.title,
    kind: params.kind ?? EndeavorKind.task,
    status: params.status ?? EndeavorStatus.pending,
    start: params.start ?? null,
    due: params.due ?? null,
    duration: params.duration ?? null,
    expiry: params.expiry ?? null,
    value: params.value ?? null,
    effort: params.effort ?? null,
    sessionPoints: params.sessionPoints ?? null,
    createdAt: triageMockAt(16, 9),
    hostedBy: params.hostedBy ?? [EndeavorHost.local],
  })

/**
 * The endeavors Triage opens on.
 *
 * Kept explicit about **citizenship**, because it is what the promotion rule
 * keys on: `hostedBy: [local]` is a citizen, `[appleReminders]` a tourist, and
 * `[appleReminders, local]` already enhanced.
 */
export const triageEndeavorFixtures = {
  /** The plain Inbox row: unscheduled, unrated, Kro's own. */
  unscheduledTask: endeavor({
    id: 'triage-unscheduled-task',
    title: 'Draft Q3 product plan',
  }),

  /** A tourist — the row confirming Triage promotes to Kro-enhanced. */
  touristReminder: endeavor({
    id: 'triage-tourist-reminder',
    title: 'Call the letting agent',
    kind: EndeavorKind.reminder,
    hostedBy: [EndeavorHost.appleReminders],
  }),

  /** Already enhanced — confirming must not add a second Kro host. */
  enhancedTask: endeavor({
    id: 'triage-enhanced-task',
    title: 'Renew the domain',
    hostedBy: [EndeavorHost.appleReminders, EndeavorHost.local],
  }),

  /**
   * A habit. `due` is not editable for this kind, so the matrix-guarded
   * `withDeferred` would no-op on it — the row that proves the explicit
   * rebuild in `TriageApplication` is doing real work.
   */
  habit: endeavor({
    id: 'triage-habit',
    title: 'Stretch for ten minutes',
    kind: EndeavorKind.habit,
  }),

  /**
   * A calendar event. `sessionPoints` is not relevant to this kind, so the
   * guarded helper would drop the reward canon writes unguarded.
   */
  calendarEvent: endeavor({
    id: 'triage-calendar-event',
    title: 'Design review',
    kind: EndeavorKind.calendarEvent,
    start: triageMockAt(17, 14),
    duration: 3600,
  }),

  /** Every prefill field already carried — the "nothing defaults" case. */
  fullyPrefilled: endeavor({
    id: 'triage-fully-prefilled',
    title: 'Ship the migration',
    due: triageMockAt(19, 9),
    duration: 1500,
    expiry: triageMockAt(19, 17),
    value: 4,
    effort: 2,
    sessionPoints: 55,
  }),

  /** Scheduled by `start` rather than `due` — the prefill's `?? start` branch. */
  startOnlyTask: endeavor({
    id: 'triage-start-only-task',
    title: 'Review the deck',
    start: triageMockAt(18, 15, 30),
    duration: 90,
  }),

  /**
   * Started but un-estimated — the zero-length block. It sits on the mock day
   * so the gap search has to prove that a duration-less endeavor pushes no
   * candidate.
   */
  startNoDurationTask: endeavor({
    id: 'triage-start-no-duration-task',
    title: 'Skim the release notes',
    start: triageMockAt(17, 13),
  }),

  /** Hosted in Kro Cloud as well as locally — the one with a push target. */
  cloudHostedTask: endeavor({
    id: 'triage-cloud-hosted-task',
    title: 'File the expenses',
    hostedBy: [EndeavorHost.local, EndeavorHost.supabase],
  }),
} as const

/** Two blocks on the mock day: 10:00–11:00 and 11:15–11:45. */
const busyMorningEndeavors: readonly Endeavor[] = [
  endeavor({
    id: 'triage-day-standup',
    title: 'Standup',
    kind: EndeavorKind.calendarEvent,
    start: triageMockAt(17, 10),
    duration: 3600,
  }),
  endeavor({
    id: 'triage-day-1-1',
    title: 'One to one',
    kind: EndeavorKind.calendarEvent,
    start: triageMockAt(17, 11, 15),
    duration: 1800,
  }),
]

/**
 * The local days the gap search runs against.
 *
 * `busyMorning` is the interesting one and its numbers are chosen so the answer
 * *changes with the duration*: from 10:15 a 15-minute task fits at 11:00, but a
 * 25-minute one does not (it would run into the 11:15 block) and lands at
 * 11:45. A duration-blind search cannot tell those two apart.
 */
export const triageDayFixtures = {
  empty: [] as readonly TriageBusyInterval[],
  busyMorning: triageBusyIntervalsFor(busyMorningEndeavors, TRIAGE_MOCK_NOW),
  /** One block from 00:00 to 23:59 — no gap exists at all. */
  fullyBooked: triageBusyIntervalsFor(
    [
      endeavor({
        id: 'triage-day-offsite',
        title: 'Offsite',
        kind: EndeavorKind.calendarEvent,
        start: triageMockAt(17, 0),
        duration: 24 * 3600,
      }),
    ],
    TRIAGE_MOCK_NOW,
  ),
} as const

/** The endeavors `busyMorning` is built from, for a Producer suite's store. */
export const triageDayEndeavorFixtures = busyMorningEndeavors

/** Every fixture endeavor, as one pool a Producer suite can seed a store with. */
export const triageFixturePool: readonly Endeavor[] = [
  ...Object.values(triageEndeavorFixtures),
  ...busyMorningEndeavors,
]

/** The same pool as stored rows, so a suite never encodes a record by hand. */
export const triageFixtureRecords = (
  now: Date = TRIAGE_MOCK_NOW,
): readonly EndeavorRecord[] =>
  triageFixturePool.map((value) => endeavorRecordFromEndeavor(value, { now }))

/** A session seed, so a suite never assembles one field by field. */
export const triageSessionSeed = (
  overrides: Partial<TriageSessionSeed> = {},
): TriageSessionSeed => ({
  endeavor: triageEndeavorFixtures.unscheduledTask,
  endeavorSymbol: TRIAGE_DEFAULT_SYMBOL,
  durationOptionsMinutes: defaultTriageDurationOptionsMinutes,
  busyIntervals: triageDayFixtures.empty,
  nextFreeSlotToday: null,
  isEditReachable: false,
  now: TRIAGE_MOCK_NOW,
  ...overrides,
})

const openedOn = (seed: TriageSessionSeed): TriageState =>
  withSessionOpened(withFetchStarted(initialTriageState), seed)

const pristine = openedOn(triageSessionSeed())

const scheduled = withQuadrantPicked(
  withDurationPicked(pristine, 25),
  EisenhowerQuadrant.decide,
  TRIAGE_MOCK_NOW,
)

/**
 * The states the surface supports, each produced by the real Shifters.
 *
 * They mirror canon's own `States` list — Pristine, quadrant-without-date,
 * quadrant-with-date, and the two the durable save adds.
 */
export const triageStateMocks = {
  idle: initialTriageState,
  loading: withFetchStarted(initialTriageState),
  failed: withException(
    initialTriageState,
    TriageExceptions.sessionLoadFailed('IndexedDB is unavailable'),
  ),

  /** Session open, nothing picked. Complete is disabled. */
  pristine,

  /** Archive picked: a quadrant, no date — and the gate is open anyway. */
  archivePicked: withQuadrantPicked(
    pristine,
    EisenhowerQuadrant.delete,
    TRIAGE_MOCK_NOW,
  ),

  /** Schedule picked with a 25-minute chip: quadrant + seeded date + expiry. */
  scheduled,

  /** Prioritize on a busy morning — the gap search's own state. */
  prioritizedOnBusyDay: withQuadrantPicked(
    withDurationPicked(
      openedOn(
        triageSessionSeed({ busyIntervals: triageDayFixtures.busyMorning }),
      ),
      25,
    ),
    EisenhowerQuadrant.prioritize,
    TRIAGE_MOCK_NOW,
  ),

  /** A confirmed triage, mid-save. */
  saving: withSaveStarted(withOutcomeRaised(scheduled, 'completed')),

  /** Saved locally with nothing to push. */
  savedLocalOnly: withSaved(withSaveStarted(scheduled), {
    push: { kind: 'notApplicable' },
    now: TRIAGE_MOCK_NOW,
  }),

  /** Saved locally with a push that did not land — the retriable state. */
  savedPushDeferred: withSaved(withSaveStarted(scheduled), {
    push: {
      kind: 'deferred',
      hosts: [EndeavorHost.supabase],
      reason: 'transportUnavailable',
    },
    now: TRIAGE_MOCK_NOW,
  }),

  /** The local save failed — the decision was **not** captured. */
  saveFailed: withSaveFailed(
    withSaveStarted(scheduled),
    TriageExceptions.localSaveFailed('QuotaExceededError'),
  ),
} as const

/** One decision per branch of `applyTriageDecision`'s (due, duration) switch. */
export const triageDecisionFixtures = {
  /** Both set — start = due, duration = picked. */
  dueAndDuration: {
    endeavorId: triageEndeavorFixtures.unscheduledTask.id,
    quadrant: EisenhowerQuadrant.decide,
    durationSeconds: 1500,
    dueDate: triageMockAt(24, 10, 7),
    rewardPoints: 20,
    value: 3,
    effort: 2,
    expiryDate: triageMockAt(24, 11, 7),
  } satisfies TriageDecision,

  /** Due only — update due and append the `triage` audit entry. */
  dueOnly: {
    endeavorId: triageEndeavorFixtures.unscheduledTask.id,
    quadrant: EisenhowerQuadrant.decide,
    durationSeconds: null,
    dueDate: triageMockAt(24, 10, 7),
    rewardPoints: 15,
    value: 3,
    effort: 1,
    expiryDate: triageMockAt(24, 11, 7),
  } satisfies TriageDecision,

  /** Duration only — keep the existing start, take the new duration. */
  durationOnly: {
    endeavorId: triageEndeavorFixtures.startOnlyTask.id,
    // A non-Archive quadrant: Archive short-circuits scheduling entirely,
    // which would contradict this fixture's stated purpose.
    quadrant: EisenhowerQuadrant.delegate,
    durationSeconds: 2700,
    dueDate: null,
    rewardPoints: 10,
    value: null,
    effort: null,
    expiryDate: null,
  } satisfies TriageDecision,

  /** Archive — status only, and none of the Kro-enhanced fields. */
  archive: {
    endeavorId: triageEndeavorFixtures.unscheduledTask.id,
    quadrant: EisenhowerQuadrant.delete,
    durationSeconds: 1500,
    dueDate: null,
    rewardPoints: 99,
    value: 5,
    effort: 5,
    expiryDate: triageMockAt(24, 11, 7),
  } satisfies TriageDecision,
} as const
