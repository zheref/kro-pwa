/**
 * `EndeavorsLens` and `EndeavorsLensSnapshot` fixtures — canon
 * `KroCore/Vistas/Mocks/EndeavorsLens+Mocks.swift`, ported entry for entry.
 *
 * Nine lens variants and seven snapshot variants, in canon's own
 * convenient / neutral / inconvenient grouping (`RC-13`). The snapshot set is
 * deliberately the smaller one: it mirrors only the user-mutable subset, so the
 * two config-only variants (`readOnly`, `groupedByHost`'s `sort`) have nothing
 * to persist.
 */
import { EndeavorHost } from '../../domain/endeavor/EndeavorHost'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { EndeavorStatus } from '../../domain/endeavor/EndeavorStatus'
import { EndeavorComputedState } from '../EndeavorComputedState'
import { EndeavorGroupingCriteria } from '../EndeavorCriteria'
import type { EndeavorsLens } from '../EndeavorsLens'
import { UserFilter, makeEndeavorsLens } from '../EndeavorsLens'
import type { EndeavorsLensSnapshot } from '../EndeavorsLensSnapshot'
import { makeEndeavorsLensSnapshot } from '../EndeavorsLensSnapshot'

export const endeavorsLensMocks = {
  // ---------------------------------------------------------------- convenient

  /** Every toggle untouched — what a fresh Find vista uses. */
  default: makeEndeavorsLens(),

  /** The user hid tasks; only the other kinds remain visible. */
  tasksHidden: makeEndeavorsLens({ hiddenKinds: [EndeavorKind.task] }),

  /** The user hid Google Calendar; local and Kro-hosted items remain. */
  googleHidden: makeEndeavorsLens({
    hiddenHosts: [EndeavorHost.googleCalendar],
  }),

  // ------------------------------------------------------------------- neutral

  /** A typed search query, no other filter applied. */
  searchOnly: makeEndeavorsLens({ searchQuery: 'groceries' }),

  // -------------------------------------------------------------- inconvenient

  /** Show-archived on, so closed and skipped items become visible. */
  showArchived: makeEndeavorsLens({ showArchived: true }),

  /**
   * Every filter active at once — the UX stress test. Note the search string
   * matches nothing, so this lens narrows any set to empty and is what a
   * "your filters hide everything" empty state is asserted against.
   */
  everythingHidden: makeEndeavorsLens({
    hiddenKinds: [
      EndeavorKind.task,
      EndeavorKind.calendarEvent,
      EndeavorKind.habit,
      EndeavorKind.behavior,
      EndeavorKind.blueprint,
      EndeavorKind.background,
    ],
    hiddenHosts: [
      EndeavorHost.supabase,
      EndeavorHost.local,
      EndeavorHost.appleCalendar,
      EndeavorHost.googleCalendar,
      EndeavorHost.outlookCalendar,
      EndeavorHost.appleReminders,
    ],
    hiddenStatuses: [EndeavorStatus.pending, EndeavorStatus.ongoing],
    hiddenCalendarIds: ['work-cal', 'personal-cal'],
    searchQuery: 'impossible match',
    showArchived: false,
  }),

  /** Grouping switched off its default. */
  groupedByHost: makeEndeavorsLens({
    grouping: EndeavorGroupingCriteria.host,
  }),

  /** A read-only vista's lens: it exposes no toggle at all (the Inbox shape). */
  readOnly: makeEndeavorsLens({ exposes: [] }),

  /** The Do tab's user pattern: overdue and expired hidden, archived shown. */
  doComputedHidden: makeEndeavorsLens({
    hiddenComputedStates: [
      EndeavorComputedState.overdue,
      EndeavorComputedState.expired,
    ],
    showArchived: true,
    exposes: [UserFilter.kinds, UserFilter.hosts, UserFilter.computedStates],
  }),
} satisfies Record<string, EndeavorsLens>

/** Every lens fixture — nine variants, comfortably past `RC-13`'s seven. */
export const allEndeavorsLensMocks: readonly EndeavorsLens[] =
  Object.values(endeavorsLensMocks)

export const endeavorsLensSnapshotMocks = {
  default: makeEndeavorsLensSnapshot(),

  tasksHidden: makeEndeavorsLensSnapshot({
    hiddenKinds: [EndeavorKind.task],
  }),

  searchOnly: makeEndeavorsLensSnapshot({ searchQuery: 'groceries' }),

  showArchived: makeEndeavorsLensSnapshot({ showArchived: true }),

  googleHidden: makeEndeavorsLensSnapshot({
    hiddenHosts: [EndeavorHost.googleCalendar],
  }),

  groupedByHost: makeEndeavorsLensSnapshot({
    grouping: EndeavorGroupingCriteria.host,
  }),

  everythingHidden: makeEndeavorsLensSnapshot({
    hiddenKinds: [
      EndeavorKind.task,
      EndeavorKind.calendarEvent,
      EndeavorKind.habit,
      EndeavorKind.behavior,
      EndeavorKind.blueprint,
      EndeavorKind.background,
    ],
    hiddenHosts: [
      EndeavorHost.supabase,
      EndeavorHost.local,
      EndeavorHost.appleCalendar,
      EndeavorHost.googleCalendar,
      EndeavorHost.outlookCalendar,
      EndeavorHost.appleReminders,
    ],
    hiddenStatuses: [EndeavorStatus.pending, EndeavorStatus.ongoing],
    hiddenCalendarIds: ['work-cal'],
  }),
} satisfies Record<string, EndeavorsLensSnapshot>

/** Every snapshot fixture — seven variants, `RC-13`'s floor exactly. */
export const allEndeavorsLensSnapshotMocks: readonly EndeavorsLensSnapshot[] =
  Object.values(endeavorsLensSnapshotMocks)
