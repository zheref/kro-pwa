/**
 * Canned `EndeavorDetailState` variants and the endeavors behind them
 * (`RC-31`, `UZF-18`).
 *
 * Every test in this feature reads its state from here — a `State` is never
 * constructed inline — and `#30`'s stories will consume the same variants.
 *
 * The fixture set is chosen so the **matrix** is exercised, not just the happy
 * path: a task (every field and relation editable), a calendar event (no `due`,
 * no `sessionPoints`, no `performances`), a habit (no `due`, no `hosts`) and a
 * blueprint (no `start`, `duration`, `sessionPoints`, and no relations at all
 * beyond `defers`' own rule). A truth table built from any one of those alone
 * would pass while the matrix was wrong.
 */
import type { Endeavor } from '@kro/core'
import {
  EndeavorHost,
  EndeavorKind,
  EndeavorStatus,
  PerformResolution,
  makeEndeavor,
  makePerform,
  makeShadow,
} from '@kro/core'
import { EndeavorDetailExceptions } from './EndeavorDetailException'
import type { EndeavorDetailState } from './EndeavorDetailState'
import { initialEndeavorDetailState } from './EndeavorDetailState'
import { durationDraftFor } from './EndeavorDuration'

/** A fixed instant. Every fixture below is relative to it. */
export const DETAIL_REFERENCE_NOW = new Date(2026, 5, 18, 9, 40, 0, 0)

const at = (hour: number, minute = 0): Date =>
  new Date(2026, 5, 18, hour, minute, 0, 0)

/** Three qualifying sessions — exactly the empirical sample minimum. */
const qualifyingPerformances = [
  makePerform({
    date: at(8, 0),
    duration: 1500,
    resolution: PerformResolution.finished,
    wasCompletedInSession: true,
    rewardPoints: 5,
  }),
  makePerform({
    date: at(9, 0),
    duration: 1800,
    resolution: PerformResolution.complete,
    wasCompletedInSession: true,
    rewardPoints: 4,
  }),
  makePerform({
    date: at(10, 0),
    duration: 2100,
    resolution: PerformResolution.finished,
    wasCompletedInSession: true,
    rewardPoints: 6,
  }),
]

export const detailEndeavorMocks = {
  /** A task: every field and every relation is editable for this kind. */
  task: makeEndeavor({
    id: 'detail-task',
    title: 'Prepare quarterly slides',
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    due: at(17, 0),
    start: at(15, 0),
    duration: 1800,
    sessionPoints: 8,
    createdAt: at(7, 0),
    hostedBy: [EndeavorHost.local],
  }),

  /** The same task with three qualifying sessions — the observed-time case. */
  taskWithSessions: makeEndeavor({
    id: 'detail-task-sessions',
    title: 'Write the release notes',
    kind: EndeavorKind.task,
    status: EndeavorStatus.ongoing,
    due: at(18, 0),
    createdAt: at(6, 0),
    hostedBy: [EndeavorHost.local],
    performances: qualifyingPerformances,
  }),

  /** One session short of the minimum — the recommendation stays locked. */
  taskWithOneSession: makeEndeavor({
    id: 'detail-task-one-session',
    title: 'Sketch the onboarding',
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    createdAt: at(6, 0),
    hostedBy: [EndeavorHost.local],
    performances: [qualifyingPerformances[0] as ReturnType<typeof makePerform>],
  }),

  /** A calendar event: no `due`, no `sessionPoints`, no `performances`. */
  event: makeEndeavor({
    id: 'detail-event',
    title: 'Team sync',
    kind: EndeavorKind.calendarEvent,
    status: EndeavorStatus.planned,
    start: at(11, 0),
    duration: 3600,
    createdAt: at(5, 0),
    hostedBy: [EndeavorHost.googleCalendar],
    shadows: [
      makeShadow({
        originalTitle: 'Team sync',
        sourceIdentifier: 'gcal-1',
        kind: EndeavorKind.calendarEvent,
        source: EndeavorHost.googleCalendar,
      }),
    ],
  }),

  /** A habit: no `due`, no `hosts`, but sessions and points are its own. */
  habit: makeEndeavor({
    id: 'detail-habit',
    title: 'Stretch',
    kind: EndeavorKind.habit,
    status: EndeavorStatus.pending,
    sessionPoints: 2,
    createdAt: at(4, 0),
    hostedBy: [EndeavorHost.local],
  }),

  /** A blueprint: one of the three meta kinds — no `start`, no `duration`. */
  blueprint: makeEndeavor({
    id: 'detail-blueprint',
    title: 'Quarterly review template',
    kind: EndeavorKind.blueprint,
    status: EndeavorStatus.pending,
    createdAt: at(3, 0),
    hostedBy: [EndeavorHost.local],
  }),

  /** A blank title — the one validation rule's failing case. */
  untitled: makeEndeavor({
    id: 'detail-untitled',
    title: '   ',
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    createdAt: at(3, 0),
    hostedBy: [EndeavorHost.local],
  }),
} as const

/** Every fixture, in declaration order. */
export const allDetailEndeavorMocks: readonly Endeavor[] = Object.values(
  detailEndeavorMocks,
)

const presented = (endeavor: Endeavor): EndeavorDetailState => ({
  ...initialEndeavorDetailState,
  endeavor,
})

const editing = (endeavor: Endeavor): EndeavorDetailState => ({
  ...presented(endeavor),
  destination: { kind: 'edit', focusedField: null },
  edit: { working: endeavor, original: endeavor, focusedField: null },
})

export const detailStateMocks = {
  /** Closed — nothing is presented. */
  closed: initialEndeavorDetailState,

  /** Detail open on a task, no editor presented. */
  presentedTask: presented(detailEndeavorMocks.task),

  /** Detail open on a calendar event — the matrix hides three fields. */
  presentedEvent: presented(detailEndeavorMocks.event),

  /** Detail open on a habit — no due date, no host management. */
  presentedHabit: presented(detailEndeavorMocks.habit),

  /** The full editor open over a task, nothing changed yet. */
  editingTask: editing(detailEndeavorMocks.task),

  /** The editor open with one field in focus, as a Detail row tap opens it. */
  editingTitleOnly: {
    ...presented(detailEndeavorMocks.task),
    destination: { kind: 'edit', focusedField: 'title' },
    edit: {
      working: detailEndeavorMocks.task,
      original: detailEndeavorMocks.task,
      focusedField: 'title',
    },
  } satisfies EndeavorDetailState as EndeavorDetailState,

  /** The editor open with an unsaved change — the dirty case. */
  editingDirty: {
    ...editing(detailEndeavorMocks.task),
    edit: {
      working: { ...detailEndeavorMocks.task, title: 'Prepare the deck' },
      original: detailEndeavorMocks.task,
      focusedField: null,
    },
  } satisfies EndeavorDetailState as EndeavorDetailState,

  /** The editor open over a blank title — dirty but invalid. */
  editingInvalid: {
    ...editing(detailEndeavorMocks.untitled),
    edit: {
      working: { ...detailEndeavorMocks.untitled, title: '' },
      original: detailEndeavorMocks.untitled,
      focusedField: null,
    },
  } satisfies EndeavorDetailState as EndeavorDetailState,

  /** The Duration profile open over a task with three sessions. */
  durationOpen: {
    ...presented(detailEndeavorMocks.taskWithSessions),
    destination: { kind: 'duration' },
    edit: {
      working: detailEndeavorMocks.taskWithSessions,
      original: detailEndeavorMocks.taskWithSessions,
      focusedField: 'duration',
    },
    duration: durationDraftFor(detailEndeavorMocks.taskWithSessions),
  } satisfies EndeavorDetailState as EndeavorDetailState,

  /** The Performances relation open over a task — editable. */
  performancesOpen: {
    ...presented(detailEndeavorMocks.taskWithSessions),
    destination: { kind: 'relation', relation: 'performances' },
  } satisfies EndeavorDetailState as EndeavorDetailState,

  /** The Performances relation open over an event — read-only, with a reason. */
  performancesReadOnly: {
    ...presented(detailEndeavorMocks.event),
    destination: { kind: 'relation', relation: 'performances' },
  } satisfies EndeavorDetailState as EndeavorDetailState,

  /** The Hosts relation open over a task — nothing attachable in this build. */
  hostsOpen: {
    ...presented(detailEndeavorMocks.task),
    destination: { kind: 'relation', relation: 'hosts' },
  } satisfies EndeavorDetailState as EndeavorDetailState,

  /** A save that failed — the working copy is untouched, still dirty. */
  saveFailed: {
    ...editing(detailEndeavorMocks.task),
    edit: {
      working: { ...detailEndeavorMocks.task, title: 'Prepare the deck' },
      original: detailEndeavorMocks.task,
      focusedField: null,
    },
    save: {
      kind: 'failed',
      exception: EndeavorDetailExceptions.localPersistenceFailed('disk full'),
    },
  } satisfies EndeavorDetailState as EndeavorDetailState,

  /** A save in flight. */
  saving: {
    ...editing(detailEndeavorMocks.task),
    save: { kind: 'saving' },
  } satisfies EndeavorDetailState as EndeavorDetailState,
} as const
