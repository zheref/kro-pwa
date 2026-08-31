/**
 * `Endeavor` fixtures — `RC-13`: three convenient, one neutral, three
 * inconvenient, and never a domain value written inline in a test.
 *
 * Every date is built with the **local-time** `Date` constructor rather than
 * an ISO `Z` string, so predicates that reason about calendar days
 * (`isDueToday`) answer the same thing in every time zone CI might run in.
 * Nothing here reads the clock: a fixture that moved with wall time could pass
 * on Monday and fail on Tuesday.
 */
import { makeProject } from '../../shared/EndeavorList'
import { userOwner } from '../../shared/Owner'
import { WeekDay } from '../../shared/WeekDay'
import { makeDefer } from '../Defer'
import { type Endeavor, makeEndeavor } from '../Endeavor'
import { EndeavorHost } from '../EndeavorHost'
import { EndeavorKind } from '../EndeavorKind'
import { EndeavorStatus } from '../EndeavorStatus'
import { EndeavorTag } from '../EndeavorTag'
import { PerformResolution, makePerform, makePerformFragment } from '../Perform'
import { makeRepeatConfig, weeklyBase } from '../RepeatConfig'
import { makeShadow } from '../Shadow'

/** The instant the whole fixture set is anchored to: 15 Jan 2026, 09:00 local. */
export const MOCK_NOW = new Date(2026, 0, 15, 9, 0, 0)

const at = (
  day: number,
  hour: number,
  minute = 0,
  month = 0,
  year = 2026,
): Date => new Date(year, month, day, hour, minute, 0)

export const endeavorMocks = {
  // ---------------------------------------------------------------- convenient

  /**
   * The happy path: a fully-enriched Kro-citizen task, due later today, rated
   * in Triage, hosted by both Kro stores.
   */
  plannedTask: makeEndeavor({
    id: 'endeavor-planned-task',
    title: 'Pay Mortgage',
    kind: EndeavorKind.task,
    status: EndeavorStatus.planned,
    sessionPoints: 25,
    start: at(15, 14, 30),
    duration: 1800,
    minimumDuration: 900,
    maximumDuration: 3600,
    due: at(15, 17, 0),
    value: 5,
    effort: 3,
    expiry: at(15, 23, 0),
    associatedColor: '#4C6EF5',
    projectId: 'project-finances',
    list: makeProject({
      id: 'project-finances',
      title: 'Finances',
      color: '#4C6EF5',
    }),
    createdAt: at(14, 8, 15),
    updatedAt: at(15, 8, 45),
    tags: [EndeavorTag.onDesk],
    owner: userOwner('user-ada'),
    hostedBy: [EndeavorHost.supabase, EndeavorHost.local],
  }),

  /**
   * A calendar event mirrored from Google Calendar: driven by `start` +
   * `duration`, no `due` at all (the matrix says `due` is irrelevant to this
   * kind), and carrying the shadow that links it to its origin.
   */
  todayEvent: makeEndeavor({
    id: 'endeavor-today-event',
    title: 'Cook Breakfast',
    kind: EndeavorKind.calendarEvent,
    status: EndeavorStatus.planned,
    start: at(15, 8, 0),
    duration: 1800,
    createdAt: at(14, 20, 0),
    hostedBy: [EndeavorHost.googleCalendar, EndeavorHost.local],
    shadows: [
      makeShadow({
        originalTitle: 'Cook Breakfast',
        sourceIdentifier: 'gcal-event-8891',
        kind: EndeavorKind.calendarEvent,
        source: 'googleCalendar',
        group: 'Personal',
      }),
    ],
  }),

  /**
   * A weekday habit: recurrence every other week on Mon/Wed/Fri, a daily
   * slot, session points, and no `due` — habits always apply "today".
   */
  weekdayHabit: makeEndeavor({
    id: 'endeavor-weekday-habit',
    title: 'Morning Stretch',
    kind: EndeavorKind.habit,
    status: EndeavorStatus.ongoing,
    sessionPoints: 10,
    start: at(15, 7, 0),
    duration: 900,
    repeatConfig: makeRepeatConfig(
      weeklyBase([WeekDay.monday, WeekDay.wednesday, WeekDay.friday]),
      2,
    ),
    value: 4,
    effort: 2,
    createdAt: at(2, 6, 30),
    tags: [EndeavorTag.session],
    hostedBy: [EndeavorHost.supabase],
  }),

  // ------------------------------------------------------------------- neutral

  /**
   * The floor: an unsaved draft with only what construction demands. Every
   * optional is at its default, `hostedBy` is empty (so `isOnlyInMemory` is
   * true), and `tags`/`shadows` are `null` rather than `[]`.
   */
  bareDraft: makeEndeavor({
    id: 'endeavor-bare-draft',
    title: '',
    kind: EndeavorKind.task,
    isDraft: true,
  }),

  // -------------------------------------------------------------- inconvenient

  /**
   * A blocked meta kind. `blueprint` has no `start`, `duration`, `due` or
   * `sessionPoints` relevance at all, `blocked` sorts at `indexValue` −1
   * ahead of every other status, and the title is long, non-ASCII and
   * bidirectional.
   */
  blockedBlueprint: makeEndeavor({
    id: 'endeavor-blocked-blueprint',
    title:
      '設計図 — a blueprint whose title runs well past any sensible line box, mixes 日本語 with مرحبا and an emoji 🧭, and still has to render',
    kind: EndeavorKind.blueprint,
    status: EndeavorStatus.blocked,
    createdAt: at(3, 11, 0, 11, 2025),
    tags: [EndeavorTag.replica],
    errorMessages: ['Sync failed: upstream rejected the write'],
    inActivity: true,
    hostedBy: [EndeavorHost.local],
  }),

  /**
   * A Kro-tourist: hosted **only** by an external provider, so it has nowhere
   * to store a Kro-enhanced field. Overdue by two days, carries a deferral
   * history that did not save it, and its shadow reports Apple priority `0` —
   * which explicitly means "no priority", not "unknown".
   */
  overdueTouristReminder: makeEndeavor({
    id: 'endeavor-overdue-tourist',
    title: 'Renew passport',
    kind: EndeavorKind.reminder,
    status: EndeavorStatus.pending,
    due: at(13, 9, 0),
    defers: [
      makeDefer({ made: at(10, 9, 0), reason: 'Office closed', target: at(12, 9, 0) }),
      makeDefer({ made: at(12, 9, 0), reason: null, target: at(13, 9, 0) }),
    ],
    createdAt: at(1, 7, 0),
    hostedBy: [EndeavorHost.appleReminders],
    shadows: [
      makeShadow({
        originalTitle: 'Renew passport',
        sourceIdentifier: 'reminders-x-4410',
        kind: EndeavorKind.reminder,
        source: 'appleReminders',
        group: 'Errands',
        appleReminderPriority: 0,
      }),
    ],
  }),

  /**
   * Closed, with a messy performance history: one aborted attempt, one
   * finished early, one complete with two fragments — and `tags` / `shadows`
   * as **empty arrays**, which is a different state from `null` and the one
   * `withRemovedShadow` normalizes away.
   */
  completedWithPerformances: makeEndeavor({
    id: 'endeavor-completed-performances',
    title: 'Buy Optical Mouse',
    kind: EndeavorKind.task,
    status: EndeavorStatus.closed,
    sessionPoints: 40,
    duration: 1500,
    due: at(9, 19, 0),
    completed: at(9, 19, 42),
    performances: [
      makePerform({
        date: at(7, 10, 0),
        duration: 240,
        resolution: PerformResolution.aborted,
        rewardPoints: 0,
      }),
      makePerform({
        date: at(8, 10, 0),
        duration: 900,
        notes: 'Stopped once the shortlist was down to two',
        resolution: PerformResolution.finished,
        rewardPoints: 12,
        wasCompletedInSession: true,
      }),
      makePerform({
        date: at(9, 18, 30),
        duration: 1500,
        resolution: PerformResolution.complete,
        sessionFragments: [
          makePerformFragment({
            startedAt: at(9, 18, 30),
            endedAt: at(9, 18, 55),
          }),
          makePerformFragment({ startedAt: at(9, 19, 0), endedAt: at(9, 19, 42) }),
        ],
        rewardPoints: 40,
        followUpNotes: 'Ordered the wired one after all',
        completedAt: at(9, 19, 42),
        wasCompletedInSession: true,
      }),
    ],
    value: 2,
    effort: 1,
    createdAt: at(5, 12, 0),
    updatedAt: at(9, 19, 42),
    tags: [],
    shadows: [],
    hostedBy: [EndeavorHost.supabase, EndeavorHost.local],
  }),
} satisfies Record<string, Endeavor>

/** Every fixture, for suites that assert a property across the whole spread. */
export const allEndeavorMocks: readonly Endeavor[] = Object.values(endeavorMocks)
