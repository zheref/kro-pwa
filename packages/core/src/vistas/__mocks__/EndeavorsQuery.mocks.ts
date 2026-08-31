/**
 * `EndeavorsQuery` fixtures — canon
 * `KroCore/Vistas/Mocks/EndeavorsQuery+Mocks.swift`, ported entry for entry.
 *
 * `RC-13`'s spread, as canon labels it: three convenient, one neutral, four
 * inconvenient. The dates are the same `timeIntervalSince1970` values canon
 * uses, so the reversed-range fixture pins the identical expectation.
 */
import { EndeavorHost } from '../../domain/endeavor/EndeavorHost'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { absoluteDateRange, todayDateRange } from '../DateRangeSpec'
import type { EndeavorsQuery } from '../EndeavorsQuery'
import { makeEndeavorsQuery } from '../EndeavorsQuery'

export const endeavorsQueryMocks = {
  // ---------------------------------------------------------------- convenient

  /** Everything, no filters — what Find uses by default. */
  everything: makeEndeavorsQuery(),

  /** All tasks across all hosts, no time bound. */
  allTasks: makeEndeavorsQuery({ kinds: [EndeavorKind.task] }),

  /** All events for today — Plan's shape. */
  todayEvents: makeEndeavorsQuery({
    kinds: [EndeavorKind.calendarEvent],
    dateRange: todayDateRange,
  }),

  // ------------------------------------------------------------------- neutral

  /** Only locally-hosted tasks — the offline-mode default. */
  localTasksOnly: makeEndeavorsQuery({
    hosts: [EndeavorHost.local],
    kinds: [EndeavorKind.task],
  }),

  // -------------------------------------------------------------- inconvenient

  /**
   * One host, which may well be unavailable — stress-tests the fan-out's
   * missing-host handling.
   */
  singleHostOnly: makeEndeavorsQuery({
    hosts: [EndeavorHost.googleCalendar],
    kinds: [EndeavorKind.calendarEvent],
    dateRange: todayDateRange,
  }),

  /** Everything **including** archived — the worst-case full result. */
  includingArchived: makeEndeavorsQuery({ includeArchived: true }),

  /** A specific list scope. */
  specificList: makeEndeavorsQuery({
    kinds: [EndeavorKind.task],
    lists: ['project-grocery'],
  }),

  /**
   * An absolute window with deliberately **reversed** bounds. The consumer is
   * expected to normalize to an empty window rather than fetch backwards; this
   * fixture is what pins that.
   */
  reversedRange: makeEndeavorsQuery({
    dateRange: absoluteDateRange(new Date(2_000_000), new Date(1_000_000)),
  }),
} satisfies Record<string, EndeavorsQuery>

/** Every fixture, for suites asserting a property across the whole spread. */
export const allEndeavorsQueryMocks: readonly EndeavorsQuery[] =
  Object.values(endeavorsQueryMocks)
