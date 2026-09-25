/**
 * Endeavor Activity fixtures (`RC-13`, `RC-31`) — the domain endeavors a
 * Producer suite seeds the store with, and the canned `State` variants every
 * reducer, Selector, story and render test reads. Nothing reads the clock:
 * every instant is a local-time constructor anchored to `ACTIVITY_NOW`.
 */
import {
  type Endeavor,
  EndeavorKind,
  PerformResolution,
  makeEndeavor,
  makePerform,
  makePerformFragment,
} from '@kro/core'
import { EndeavorActivityExceptions } from './EndeavorActivityException'
import {
  type EndeavorActivityState,
  initialEndeavorActivityState,
} from './EndeavorActivityFeature'
import { activityRowsFor } from './EndeavorActivityRows'

export const ACTIVITY_NOW = new Date(2026, 0, 15, 9, 0, 0)

const at = (day: number, hour: number, minute = 0): Date =>
  new Date(2026, 0, day, hour, minute, 0)

const fragment = (day: number, hour: number, minute: number, minutes: number) =>
  makePerformFragment({
    startedAt: at(day, hour, minute),
    endedAt: new Date(at(day, hour, minute).getTime() + minutes * 60_000),
  })

/** ≥7 domain variants (`RC-13`): happy, single, empty, long, non-ASCII, habit, aborted-only — plus the two unsupported kinds. */
export const activityEndeavorMocks = {
  many: makeEndeavor({
    id: 'activity-many',
    title: 'Write the quarterly report',
    kind: EndeavorKind.task,
    performances: [
      makePerform({
        date: at(12, 9),
        duration: 1500,
        resolution: PerformResolution.complete,
        sessionFragments: [fragment(12, 9, 0, 25)],
        rewardPoints: 25,
      }),
      makePerform({
        date: at(13, 14),
        duration: 3900,
        resolution: PerformResolution.finished,
        sessionFragments: [fragment(13, 14, 0, 40), fragment(13, 15, 0, 25)],
        rewardPoints: 10,
      }),
      makePerform({
        date: at(14, 10, 30),
        duration: 45,
        resolution: PerformResolution.aborted,
      }),
      makePerform({
        date: at(14, 18),
        duration: 0,
        resolution: PerformResolution.complete,
        rewardPoints: 5,
        completedAt: at(14, 18),
      }),
    ],
  }),
  single: makeEndeavor({
    id: 'activity-single',
    title: 'Call the plumber',
    kind: EndeavorKind.task,
    performances: [
      makePerform({
        date: at(14, 11),
        duration: 600,
        resolution: PerformResolution.complete,
        sessionFragments: [fragment(14, 11, 0, 10)],
        rewardPoints: 15,
      }),
    ],
  }),
  empty: makeEndeavor({
    id: 'activity-empty',
    title: 'Plan the garden',
    kind: EndeavorKind.task,
  }),
  longTitle: makeEndeavor({
    id: 'activity-long-title',
    title:
      'Reconcile every receipt from the conference trip against the corporate card statement before the deadline',
    kind: EndeavorKind.task,
    performances: [
      makePerform({
        date: at(10, 8),
        duration: 7200,
        resolution: PerformResolution.finished,
        rewardPoints: 40,
      }),
    ],
  }),
  unicode: makeEndeavor({
    id: 'activity-unicode',
    title: '日本語の勉強 🌸 Ñandú',
    kind: EndeavorKind.task,
    performances: [
      makePerform({
        date: at(11, 7),
        duration: 1200,
        resolution: PerformResolution.complete,
        rewardPoints: 20,
      }),
    ],
  }),
  habit: makeEndeavor({
    id: 'activity-habit',
    title: 'Morning stretch',
    kind: EndeavorKind.habit,
    performances: [
      makePerform({
        date: at(13, 7),
        duration: 600,
        resolution: PerformResolution.complete,
        rewardPoints: 5,
      }),
      makePerform({
        date: at(14, 7),
        duration: 600,
        resolution: PerformResolution.complete,
        rewardPoints: 5,
      }),
    ],
  }),
  abortedOnly: makeEndeavor({
    id: 'activity-aborted-only',
    title: 'Clean the inbox',
    kind: EndeavorKind.task,
    performances: [
      makePerform({
        date: at(14, 16),
        duration: 300,
        resolution: PerformResolution.aborted,
      }),
    ],
  }),
  reminder: makeEndeavor({
    id: 'activity-reminder',
    title: 'Take out the bins',
    kind: EndeavorKind.reminder,
  }),
  behavior: makeEndeavor({
    id: 'activity-behavior',
    title: 'No sugar',
    kind: EndeavorKind.behavior,
  }),
} satisfies Record<string, Endeavor>

export const allActivityEndeavorMocks: readonly Endeavor[] = Object.values(
  activityEndeavorMocks,
)

const loaded = (endeavor: Endeavor): EndeavorActivityState => ({
  ...initialEndeavorActivityState,
  endeavorId: endeavor.id,
  load: {
    kind: 'loaded',
    endeavor: { id: endeavor.id, title: endeavor.title, kind: endeavor.kind },
    rows: activityRowsFor(endeavor),
  },
})

/** Canned `State` variants (`RC-31`). */
export const EndeavorActivityMocks = {
  idle: initialEndeavorActivityState,
  loading: {
    ...initialEndeavorActivityState,
    endeavorId: activityEndeavorMocks.many.id,
    load: { kind: 'loading' },
  } satisfies EndeavorActivityState,
  loadedMany: loaded(activityEndeavorMocks.many),
  loadedManyCompleteTab: {
    ...loaded(activityEndeavorMocks.many),
    tab: 'complete',
  } satisfies EndeavorActivityState,
  loadedEmpty: loaded(activityEndeavorMocks.empty),
  loadedSingle: loaded(activityEndeavorMocks.single),
  loadedLongTitle: loaded(activityEndeavorMocks.longTitle),
  loadedUnicode: loaded(activityEndeavorMocks.unicode),
  loadedHabit: loaded(activityEndeavorMocks.habit),
  abortedOnlyFinishedTab: {
    ...loaded(activityEndeavorMocks.abortedOnly),
    tab: 'finished',
  } satisfies EndeavorActivityState,
  reminder: loaded(activityEndeavorMocks.reminder),
  behavior: loaded(activityEndeavorMocks.behavior),
  failed: {
    ...initialEndeavorActivityState,
    endeavorId: 'missing',
    load: {
      kind: 'failed',
      exception: EndeavorActivityExceptions.endeavorNotFound('missing'),
    },
  } satisfies EndeavorActivityState,
}
