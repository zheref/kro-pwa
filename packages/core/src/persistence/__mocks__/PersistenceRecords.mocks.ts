/**
 * Persistence-row fixtures (`RC-13`: three convenient, one neutral, three
 * inconvenient).
 *
 * **Derived from #7's `endeavorMocks`, never re-authored.** Every endeavor row
 * below is produced by running the real codec over the real domain fixture, so
 * a change to the domain model or to the encodings shows up here as a failing
 * round-trip rather than as two fixture sets that quietly disagree. That is the
 * whole point of sharing them: a hand-written record fixture is a second
 * opinion about the encoding, and the second opinion is the one that rots.
 *
 * `MOCK_NOW` is #7's anchor instant (15 Jan 2026, 09:00 local) reused for the
 * same reason: nothing here reads the clock, so a fixture cannot pass on Monday
 * and fail on Tuesday.
 */
import {
  MOCK_NOW,
  endeavorMocks,
} from '../../domain/endeavor/__mocks__/Endeavor.mocks'
import { userMocks } from '../../domain/shared/__mocks__/User.mocks'
import { makeProject } from '../../domain/shared/EndeavorList'
import { PerformResolution, makePerform } from '../../domain/endeavor/Perform'
import { makeDefer } from '../../domain/endeavor/Defer'
import type { DeferRecord } from '../DeferRecord'
import { deferRecordFromDefer } from '../DeferRecord'
import type { EndeavorRecord } from '../EndeavorRecord'
import { endeavorRecordFromEndeavor } from '../EndeavorRecord'
import { epochMillisFromDate } from '../EpochMillis'
import type { PerformanceRecord } from '../PerformanceRecord'
import {
  QUICK_COMPLETE_NOTES,
  QUICK_COMPLETE_RESOLUTION,
  performanceRecordFromPerform,
} from '../PerformanceRecord'
import type { ProjectRecord } from '../ProjectRecord'
import { projectRecordFromProject } from '../ProjectRecord'
import type { UserProfileRecord } from '../UserProfileRecord'
import { userProfileRecordFromUser } from '../UserProfileRecord'

/** The instant every fixture below is stamped at. */
export const MOCK_RECORD_NOW = MOCK_NOW

/** Its epoch-millisecond form — the watermark every clean fixture carries. */
export const MOCK_RECORD_NOW_MILLIS = epochMillisFromDate(MOCK_RECORD_NOW)

const rowFor = (
  endeavor: (typeof endeavorMocks)[keyof typeof endeavorMocks],
  overrides: Partial<EndeavorRecord> = {},
  ownerUserId: string | null = null,
): EndeavorRecord => ({
  ...endeavorRecordFromEndeavor(endeavor, {
    now: MOCK_RECORD_NOW,
    ownerUserId,
  }),
  ...overrides,
})

export const endeavorRecordMocks = {
  // ---------------------------------------------------------------- convenient

  /** The happy path: a fully enriched, owned, never-synced row. */
  plannedTask: rowFor(endeavorMocks.plannedTask, {}, 'user-ada'),

  /** A synced, clean row — `lastSynced` equal to `updatedAt`, so not dirty. */
  syncedEvent: rowFor(endeavorMocks.todayEvent, {
    lastSyncedAtEpochMillis: MOCK_RECORD_NOW_MILLIS,
  }),

  /** A recurring row, so `repeatConfigJson` is exercised end to end. */
  weekdayHabit: rowFor(endeavorMocks.weekdayHabit),

  // ------------------------------------------------------------------- neutral

  /** The floor: a draft with every optional at its default and no owner. */
  bareDraft: rowFor(endeavorMocks.bareDraft),

  // -------------------------------------------------------------- inconvenient

  /**
   * A **tombstone**: soft-deleted, and dirty because the deletion has not been
   * pushed. Every query fixture that asserts "excludes soft-deleted rows" uses
   * this one.
   */
  deletedBlueprint: rowFor(endeavorMocks.blockedBlueprint, {
    deletedAtEpochMillis: MOCK_RECORD_NOW_MILLIS,
  }),

  /**
   * A **stale** row: written long ago, synced even longer ago, so it is dirty
   * by the watermark comparison rather than by a null `lastSynced`.
   */
  staleTourist: rowFor(endeavorMocks.overdueTouristReminder, {
    updatedAtEpochMillis: MOCK_RECORD_NOW_MILLIS,
    lastSyncedAtEpochMillis: MOCK_RECORD_NOW_MILLIS - 86_400_000,
  }),

  /**
   * A row whose `kind` column names nothing — the only failure `endeavorFromRecord`
   * reports, and the one a sync sweep has to skip rather than crash on.
   */
  unknownKind: rowFor(endeavorMocks.completedWithPerformances, {
    kind: 'telepathy',
  }),
} satisfies Record<string, EndeavorRecord>

/** Every endeavor-row fixture, for suites asserting across the whole spread. */
export const allEndeavorRecordMocks: readonly EndeavorRecord[] =
  Object.values(endeavorRecordMocks)

const DEFER_ENDEAVOR_ID = endeavorMocks.overdueTouristReminder.id

export const deferRecordMocks = {
  /** Never pushed: no `serverId`, so dirty and hard-deletable. */
  neverSynced: deferRecordFromDefer(
    makeDefer({
      made: new Date(2026, 0, 10, 9, 0, 0),
      reason: 'Office closed',
      target: new Date(2026, 0, 12, 9, 0, 0),
    }),
    {
      endeavorId: DEFER_ENDEAVOR_ID,
      now: MOCK_RECORD_NOW,
      nowMillis: MOCK_RECORD_NOW_MILLIS,
    },
  ),

  /** Confirmed by the server, therefore clean. */
  synced: deferRecordFromDefer(
    makeDefer({
      made: new Date(2026, 0, 12, 9, 0, 0),
      reason: null,
      target: new Date(2026, 0, 13, 9, 0, 0),
    }),
    {
      endeavorId: DEFER_ENDEAVOR_ID,
      now: MOCK_RECORD_NOW,
      nowMillis: MOCK_RECORD_NOW_MILLIS,
      serverId: 'defer-server-1',
      lastSyncedAtEpochMillis: MOCK_RECORD_NOW_MILLIS,
    },
  ),

  /** Removed locally, remote DELETE not yet confirmed — excluded from reads. */
  pendingDeletion: deferRecordFromDefer(
    makeDefer({
      made: new Date(2026, 0, 8, 9, 0, 0),
      reason: 'Waiting on the courier',
      target: new Date(2026, 0, 9, 9, 0, 0),
    }),
    {
      endeavorId: DEFER_ENDEAVOR_ID,
      now: MOCK_RECORD_NOW,
      nowMillis: MOCK_RECORD_NOW_MILLIS,
      serverId: 'defer-server-2',
      pendingDeletion: true,
    },
  ),

  /**
   * A legacy row with **no target**, which canon hydrates as `target ?? made`.
   * Built by hand rather than through the codec, because the domain `Defer`
   * cannot express a null target — that state only exists on the row.
   */
  noTarget: {
    serverId: null,
    endeavorId: DEFER_ENDEAVOR_ID,
    made: new Date(2026, 0, 5, 9, 0, 0),
    reason: null,
    target: null,
    pendingDeletion: false,
    updatedAtEpochMillis: MOCK_RECORD_NOW_MILLIS,
    lastSyncedAtEpochMillis: null,
  },
} satisfies Record<string, DeferRecord>

const PERFORMANCE_ENDEAVOR_ID = endeavorMocks.completedWithPerformances.id

const performanceAt = endeavorMocks.completedWithPerformances.performances

export const performanceRecordMocks = {
  /** A full session with two fragments — the `sessionFragmentsJson` case. */
  withFragments: performanceRecordFromPerform(
    performanceAt[2] ??
      makePerform({
        date: MOCK_RECORD_NOW,
        duration: 0,
        resolution: PerformResolution.complete,
      }),
    {
      endeavorId: PERFORMANCE_ENDEAVOR_ID,
      nowMillis: MOCK_RECORD_NOW_MILLIS,
      serverId: 'performance-server-1',
      lastSyncedAtEpochMillis: MOCK_RECORD_NOW_MILLIS,
    },
  ),

  /** An abandoned attempt: zero points, no fragments. */
  aborted: performanceRecordFromPerform(
    performanceAt[0] ??
      makePerform({
        date: MOCK_RECORD_NOW,
        duration: 0,
        resolution: PerformResolution.aborted,
      }),
    {
      endeavorId: PERFORMANCE_ENDEAVOR_ID,
      nowMillis: MOCK_RECORD_NOW_MILLIS,
    },
  ),

  /** The **web** quick complete: `finished`, zero duration, no fragments. */
  webQuickComplete: performanceRecordFromPerform(
    makePerform({
      date: MOCK_RECORD_NOW,
      duration: 0,
      resolution: QUICK_COMPLETE_RESOLUTION,
      rewardPoints: 30,
      completedAt: MOCK_RECORD_NOW,
    }),
    {
      endeavorId: PERFORMANCE_ENDEAVOR_ID,
      nowMillis: MOCK_RECORD_NOW_MILLIS,
    },
  ),

  /**
   * The **Apple** quick complete, exactly as `recordQuickComplete` writes it:
   * `complete`, zero duration, canon's note, `sessionFragmentsData: nil`. Built
   * by hand because no web writer produces it — it is the row this platform has
   * to *read* correctly, which is the whole reason the fixture exists.
   */
  appleQuickComplete: {
    serverId: null,
    endeavorId: PERFORMANCE_ENDEAVOR_ID,
    startedAt: MOCK_RECORD_NOW,
    endedAt: MOCK_RECORD_NOW,
    durationSeconds: 0,
    notes: QUICK_COMPLETE_NOTES,
    resolution: PerformResolution.complete,
    sessionFragmentsJson: '[]',
    rewardPoints: 30,
    followUpNotes: null,
    completedAt: MOCK_RECORD_NOW,
    wasCompletedInSession: false,
    pendingDeletion: false,
    updatedAtEpochMillis: MOCK_RECORD_NOW_MILLIS,
    lastSyncedAtEpochMillis: null,
  },

  /** Removed locally, awaiting the remote DELETE. */
  pendingDeletion: performanceRecordFromPerform(
    performanceAt[1] ??
      makePerform({
        date: MOCK_RECORD_NOW,
        duration: 0,
        resolution: PerformResolution.finished,
      }),
    {
      endeavorId: PERFORMANCE_ENDEAVOR_ID,
      nowMillis: MOCK_RECORD_NOW_MILLIS,
      serverId: 'performance-server-2',
      pendingDeletion: true,
    },
  ),
} satisfies Record<string, PerformanceRecord>

export const projectRecordMocks = {
  /** Owned, never synced. */
  finances: projectRecordFromProject(
    makeProject({
      id: 'project-finances',
      title: 'Finances',
      color: '#4C6EF5',
    }),
    { now: MOCK_RECORD_NOW, ownerUserId: 'user-ada' },
  ),

  /** Group-owned, and synced clean. */
  shared: projectRecordFromProject(
    makeProject({ id: 'project-shared', title: 'Household' }),
    {
      now: MOCK_RECORD_NOW,
      ownerGroupId: 'group-home',
      lastSyncedAtEpochMillis: MOCK_RECORD_NOW_MILLIS,
    },
  ),

  /** A tombstone — the soft-delete case for project queries. */
  archived: projectRecordFromProject(
    makeProject({ id: 'project-archived', title: 'Old Move' }),
    {
      now: MOCK_RECORD_NOW,
      deletedAtEpochMillis: MOCK_RECORD_NOW_MILLIS,
    },
  ),
} satisfies Record<string, ProjectRecord>

export const userProfileRecordMocks = {
  /** The happy path. */
  typical: userProfileRecordFromUser(userMocks.complete, {
    now: MOCK_RECORD_NOW,
  }),

  /**
   * A profile with no `loginKind` column at all — the legacy row canon defaults
   * to `email_password` twice over.
   */
  legacyNoLoginKind: {
    ...userProfileRecordFromUser(userMocks.complete, { now: MOCK_RECORD_NOW }),
    id: 'user-legacy',
    loginKind: null,
    connectedServicesCsv: null,
  },
} satisfies Record<string, UserProfileRecord>
