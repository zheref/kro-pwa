/**
 * `EndeavorsVista` fixtures — canon
 * `KroCore/Vistas/Mocks/EndeavorsVista+Mocks.swift`, ported entry for entry.
 *
 * These are **not** the registry: `findLike` aliases the real `find` entry, and
 * the rest are shaped-like-a-screen values whose job is to exercise the type
 * (no capabilities, every capability, a pre-populated search, a flag-gated
 * binding). A test asserting what a *screen* does reads `EndeavorsVistas`; a
 * test asserting what the *type* does reads these.
 */
import { EndeavorHost } from '../../domain/endeavor/EndeavorHost'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { EndeavorStatus } from '../../domain/endeavor/EndeavorStatus'
import { todayDateRange } from '../DateRangeSpec'
import {
  ALL_USER_FILTERS,
  UserFilter,
  makeEndeavorsLens,
} from '../EndeavorsLens'
import {
  EndeavorOperation,
  NO_ENDEAVOR_CAPABILITIES,
  OperationRole,
  buttonRowGesture,
  contextMenuGesture,
  makeEndeavorCapabilities,
  makeEndeavorOperationBinding,
  prepOverlayGesture,
  swipeLeadingGesture,
  swipeTrailingGesture,
  tapGesture,
} from '../EndeavorCapabilities'
import { EndeavorGroupingCriteria } from '../EndeavorCriteria'
import { everythingEndeavorsQuery, makeEndeavorsQuery } from '../EndeavorsQuery'
import type { EndeavorsVista } from '../EndeavorsVista'
import { makeEndeavorsVista } from '../EndeavorsVista'
import { EndeavorsVistas } from '../EndeavorsVistas'
import {
  CardVariant,
  Density,
  makePresentationStyle,
} from '../PresentationStyle'

export const endeavorsVistaMocks = {
  // ---------------------------------------------------------------- convenient

  /** The canonical Find-shaped vista — the registry entry itself. */
  findLike: EndeavorsVistas.find,

  /** An all-tasks browser grouped by status. */
  tasksAll: makeEndeavorsVista({
    id: 'tasks.all',
    title: 'Tasks',
    query: makeEndeavorsQuery({ kinds: [EndeavorKind.task] }),
    lens: makeEndeavorsLens({
      grouping: EndeavorGroupingCriteria.status,
      exposes: [UserFilter.search, UserFilter.grouping],
    }),
    capabilities: makeEndeavorCapabilities([
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.markComplete,
        gesture: swipeTrailingGesture,
        role: OperationRole.standard,
        icon: 'checkmark',
        label: 'Complete',
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.delete,
        gesture: swipeTrailingGesture,
        role: OperationRole.destructive,
        icon: 'trash',
        label: 'Delete',
      }),
    ]),
    presentation: makePresentationStyle({
      cardVariant: CardVariant.standardRow,
    }),
  }),

  /** Today's events in the timeline variant. */
  planDay: makeEndeavorsVista({
    id: 'plan.day',
    title: 'Today',
    query: makeEndeavorsQuery({
      kinds: [EndeavorKind.calendarEvent],
      dateRange: todayDateRange,
    }),
    lens: makeEndeavorsLens({
      grouping: EndeavorGroupingCriteria.dueSection,
      exposes: [UserFilter.hosts, UserFilter.calendars],
    }),
    capabilities: makeEndeavorCapabilities([
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.edit,
        gesture: tapGesture,
        icon: 'pencil',
        label: 'Edit',
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.delete,
        gesture: contextMenuGesture,
        role: OperationRole.destructive,
        icon: 'trash',
        label: 'Delete',
      }),
    ]),
    presentation: makePresentationStyle({
      cardVariant: CardVariant.timelineBlock,
    }),
  }),

  // ------------------------------------------------------------------- neutral

  /** Inbox-style: pending-triage tasks only, triage on tap. */
  inbox: makeEndeavorsVista({
    id: 'inbox',
    title: 'Inbox',
    query: makeEndeavorsQuery({
      kinds: [EndeavorKind.task],
      statuses: [EndeavorStatus.pending],
    }),
    lens: makeEndeavorsLens({ exposes: [] }),
    capabilities: makeEndeavorCapabilities([
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.triage,
        gesture: tapGesture,
        icon: 'scope',
        label: 'Triage',
      }),
    ]),
    presentation: makePresentationStyle({
      cardVariant: CardVariant.standardRow,
      density: Density.compact,
    }),
  }),

  // -------------------------------------------------------------- inconvenient

  /** No capabilities at all — a display-only vista. */
  displayOnly: makeEndeavorsVista({
    id: 'display.only',
    title: 'Read Only',
    query: everythingEndeavorsQuery,
    lens: makeEndeavorsLens({ exposes: [] }),
    capabilities: NO_ENDEAVOR_CAPABILITIES,
    presentation: makePresentationStyle({
      cardVariant: CardVariant.miniRow,
      density: Density.compact,
    }),
  }),

  /** Every gesture bound at once — the kitchen sink. */
  maximalOperations: makeEndeavorsVista({
    id: 'kitchen.sink',
    title: 'Everything',
    query: everythingEndeavorsQuery,
    lens: makeEndeavorsLens({ exposes: ALL_USER_FILTERS }),
    capabilities: makeEndeavorCapabilities([
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.archive,
        gesture: swipeLeadingGesture,
        role: OperationRole.destructive,
        icon: 'archivebox',
        label: 'Archive',
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.delete,
        gesture: swipeTrailingGesture,
        role: OperationRole.destructive,
        icon: 'trash',
        label: 'Delete',
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.markComplete,
        gesture: tapGesture,
        icon: 'checkmark',
        label: 'Complete',
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.defer,
        gesture: contextMenuGesture,
        icon: 'clock.arrow.circlepath',
        label: 'Defer',
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.startSession,
        gesture: contextMenuGesture,
        icon: 'play.circle',
        label: 'Start Session',
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.execute,
        gesture: prepOverlayGesture,
        icon: 'bolt',
        label: 'Execute',
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.edit,
        gesture: buttonRowGesture(0),
        icon: 'pencil',
        label: 'Edit',
      }),
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.share,
        gesture: buttonRowGesture(1),
        icon: 'square.and.arrow.up',
        label: 'Share',
      }),
    ]),
    presentation: makePresentationStyle({
      cardVariant: CardVariant.carouselHero,
      density: Density.featured,
    }),
  }),

  /**
   * A vista whose lens arrives with the search field already filled — the
   * inconvenient case for any `lens === defaultLens` equality check.
   */
  withPersistedSearch: makeEndeavorsVista({
    id: 'find.with.search',
    title: 'Find (search)',
    query: everythingEndeavorsQuery,
    lens: makeEndeavorsLens({ searchQuery: 'groceries' }),
    capabilities: EndeavorsVistas.find.capabilities,
    presentation: EndeavorsVistas.find.presentation,
  }),

  /** A vista whose only binding waits on a feature flag. */
  flagGated: makeEndeavorsVista({
    id: 'google.events',
    title: 'Google Events',
    query: makeEndeavorsQuery({
      hosts: [EndeavorHost.googleCalendar],
      kinds: [EndeavorKind.calendarEvent],
      dateRange: todayDateRange,
    }),
    lens: makeEndeavorsLens(),
    capabilities: makeEndeavorCapabilities([
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.edit,
        gesture: tapGesture,
        icon: 'pencil',
        label: 'Edit',
        requires: 'googleCalendarIntegration',
      }),
    ]),
    presentation: makePresentationStyle({
      cardVariant: CardVariant.timelineBlock,
    }),
  }),
} satisfies Record<string, EndeavorsVista>

/** Every fixture, for suites asserting a property across the whole spread. */
export const allEndeavorsVistaMocks: readonly EndeavorsVista[] =
  Object.values(endeavorsVistaMocks)
