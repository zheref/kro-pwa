/**
 * Reconciliation fixtures — `RC-13`: three convenient, one neutral, three
 * inconvenient, and never a domain value written inline in a test.
 *
 * Two kinds of export live here, deliberately:
 *
 * 1. **Named fixtures** (`reconciliationMocks`) — the `RC-13` spread, weighted
 *    towards *pathological shadows*, because shadows are where this engine's
 *    edge cases live: an empty identifier, the same identifier under two
 *    providers, a legacy shadow with no priority evidence, a chain that only
 *    links transitively.
 * 2. **Builders** (`appleRow`, `localMirrorRow`, `seriesOccurrenceRow`, …) —
 *    ports of the helpers canon's own `EndeavorSourceResolutionTests` uses.
 *    The suites here are table-driven over provider metadata, and a table of
 *    thirty classification rows cannot be thirty hand-written fixtures without
 *    burying the rule being asserted. The builders are how a table row becomes
 *    a domain value without a test constructing one inline.
 *
 * **Every instant is UTC**, and the suites pair them with `utcCalendar`. The
 * series rules compare wall-clock times and calendar days, so a fixture built
 * in local time would group differently on a runner in another zone — the
 * exact non-determinism canon avoids by threading a `Calendar` through.
 */
import { type Endeavor, makeEndeavor } from '../../endeavor/Endeavor'
import { EndeavorHost } from '../../endeavor/EndeavorHost'
import { EndeavorKind } from '../../endeavor/EndeavorKind'
import { EndeavorStatus } from '../../endeavor/EndeavorStatus'
import { PerformResolution, makePerform } from '../../endeavor/Perform'
import {
  type RepeatConfig,
  dailyBase,
  makeRepeatConfig,
  monthlyBase,
  weeklyBase,
  yearlyBase,
} from '../../endeavor/RepeatConfig'
import { Month } from '../../shared/Month'
import { WeekDay } from '../../shared/WeekDay'
import { type Shadow, makeShadow } from '../../endeavor/Shadow'

/** The instant every fixture is anchored to: 26 Aug 2026, 12:00 UTC. */
export const RECONCILIATION_MOCK_NOW = new Date(Date.UTC(2026, 7, 26, 12, 0, 0))

/** August 2026, UTC, at an explicit clock time. */
export const utcAt = (day: number, hour: number, minute = 0): Date =>
  new Date(Date.UTC(2026, 7, day, hour, minute, 0))

/** The four recurrence shapes the rules discriminate between. */
export const recurrenceMocks = {
  daily: makeRepeatConfig(dailyBase()),
  weekly: makeRepeatConfig(weeklyBase([WeekDay.monday])),
  monthly: makeRepeatConfig(monthlyBase(25)),
  yearly: makeRepeatConfig(yearlyBase(29, Month.february)),
} as const

// ---------------------------------------------------------------- builders

/** A shadow pointing at an Apple Reminders record. */
export const appleShadow = (params: {
  readonly sourceIdentifier: string
  readonly title?: string
  readonly group?: string | null
  readonly priority?: number | null
  readonly kind?: EndeavorKind
}): Shadow =>
  makeShadow({
    originalTitle: params.title ?? 'Take vitamins',
    sourceIdentifier: params.sourceIdentifier,
    kind: params.kind ?? EndeavorKind.task,
    source: EndeavorHost.appleReminders,
    group: params.group ?? 'Health',
    appleReminderPriority: params.priority ?? null,
  })

/**
 * A provider-native Apple row: hosted by Apple and by no Kro store, its `id`
 * the provider's own identifier. Canon's `apple(...)` helper.
 */
export const appleRow = (params: {
  readonly id?: string
  readonly title?: string
  readonly kind?: EndeavorKind
  readonly recurrence?: RepeatConfig | null
  readonly priority?: number | null
  readonly scheduled?: boolean
  readonly group?: string | null
  readonly complete?: boolean
  readonly completed?: Date | null
  readonly due?: Date | null
}): Endeavor => {
  const id = params.id ?? 'apple-1'
  const title = params.title ?? 'Take vitamins'
  const due = params.due ?? ((params.scheduled ?? true) ? utcAt(26, 7) : null)
  return makeEndeavor({
    id,
    title,
    kind: params.kind ?? EndeavorKind.task,
    status:
      params.complete === true ? EndeavorStatus.closed : EndeavorStatus.pending,
    due,
    completed: params.completed ?? (params.complete === true ? due : null),
    repeatConfig: params.recurrence ?? null,
    hostedBy: [EndeavorHost.appleReminders],
    shadows: [
      appleShadow({
        sourceIdentifier: id,
        title,
        group: params.group ?? 'Health',
        priority: params.priority ?? null,
      }),
    ],
  })
}

/**
 * Kro's locally persisted mirror of an Apple row: hosted by `local`, linked to
 * Apple only through its shadow. Canon's `localMirror(...)`.
 */
export const localMirrorRow = (params: {
  readonly id?: string
  readonly sourceIdentifier?: string
  readonly title?: string
  readonly kind?: EndeavorKind
  readonly group?: string | null
  readonly priority?: number | null
  readonly value?: number | null
  readonly effort?: number | null
  readonly due?: Date | null
  readonly recurrence?: RepeatConfig | null
  readonly host?: EndeavorHost
}): Endeavor => {
  const title = params.title ?? 'Take vitamins'
  return makeEndeavor({
    id: params.id ?? 'local-1',
    title,
    kind: params.kind ?? EndeavorKind.task,
    due: params.due ?? utcAt(26, 7),
    repeatConfig: params.recurrence ?? null,
    value: params.value ?? null,
    effort: params.effort ?? null,
    hostedBy: [params.host ?? EndeavorHost.local],
    shadows: [
      appleShadow({
        sourceIdentifier: params.sourceIdentifier ?? 'apple-1',
        title,
        group: params.group ?? 'Health',
        priority: params.priority ?? null,
      }),
    ],
  })
}

/**
 * One materialized occurrence of a recurring provider series, on a given
 * August day at a given clock time. Canon's `seriesOccurrence(...)`.
 *
 * A completed occurrence carries **no** recurrence rule, which is exactly the
 * provider behaviour the collapse rule exists to handle.
 */
export const seriesOccurrenceRow = (params: {
  readonly id: string
  readonly day: number
  readonly hour?: number
  readonly title?: string
  readonly group?: string | null
  readonly recurrence?: RepeatConfig | null
  readonly complete?: boolean
  readonly completedAt?: Date | null
}): Endeavor => {
  const hour = params.hour ?? 7
  const title = params.title ?? 'Take vitamins'
  const due = utcAt(params.day, hour)
  return makeEndeavor({
    id: params.id,
    title,
    kind: EndeavorKind.task,
    status:
      params.complete === true ? EndeavorStatus.closed : EndeavorStatus.pending,
    due,
    completed: params.completedAt ?? (params.complete === true ? due : null),
    repeatConfig: params.recurrence ?? null,
    hostedBy: [EndeavorHost.appleReminders],
    shadows: [
      appleShadow({
        sourceIdentifier: params.id,
        title,
        group: params.group ?? 'Health',
      }),
    ],
  })
}

/**
 * Kro's enriched mirror of a series, still pointing at a **retired** provider
 * identifier — the row the rotated-identifier repair must reconnect.
 */
export const seriesMirrorRow = (params: {
  readonly id?: string
  readonly sourceIdentifier?: string
  readonly title?: string
  readonly group?: string | null
  readonly hour?: number
  readonly day?: number
  readonly value?: number | null
  readonly hosts?: readonly EndeavorHost[]
}): Endeavor => {
  const title = params.title ?? 'Take vitamins'
  return makeEndeavor({
    id: params.id ?? 'mirror-1',
    title,
    kind: EndeavorKind.task,
    due: utcAt(params.day ?? 26, params.hour ?? 7),
    value: params.value ?? 4,
    hostedBy: params.hosts ?? [EndeavorHost.local],
    shadows: [
      appleShadow({
        sourceIdentifier: params.sourceIdentifier ?? 'apple-retired',
        title,
        group: params.group ?? 'Health',
      }),
    ],
  })
}

// ---------------------------------------------------------------- fixtures

export const reconciliationMocks = {
  // ---------------------------------------------------------- convenient

  /**
   * The enriched local mirror: Kro's own row for an Apple reminder, carrying
   * the `value` and `effort` the user set in Triage. The carrier every merge
   * must preserve.
   */
  enrichedLocalMirror: localMirrorRow({
    id: 'local-vitamins',
    sourceIdentifier: 'apple-vitamins',
    value: 5,
    effort: 2,
  }),

  /**
   * The provider-native row for that same reminder, fresh from this fetch:
   * daily recurrence, so it resolves to a habit and outranks the mirror's
   * stale classification.
   */
  freshAppleDailyRow: appleRow({
    id: 'apple-vitamins',
    kind: EndeavorKind.reminder,
    recurrence: recurrenceMocks.daily,
    priority: 0,
  }),

  /**
   * A Kro Cloud copy carrying the provider's identifier as its own `id` — the
   * bridge that makes mirror↔cloud a transitive, not a direct, match.
   */
  cloudCopyOfAppleRow: makeEndeavor({
    id: 'apple-vitamins',
    title: 'Take vitamins',
    kind: EndeavorKind.task,
    hostedBy: [EndeavorHost.supabase],
  }),

  // ------------------------------------------------------------- neutral

  /**
   * A plain Kro citizen: no external host, no shadow, nothing for the engine
   * to reconcile. Reconciliation must leave it exactly as it found it.
   */
  kroCitizenTask: makeEndeavor({
    id: 'kro-citizen',
    title: 'Draft the quarterly letter',
    kind: EndeavorKind.task,
    due: utcAt(27, 9),
    value: 4,
    hostedBy: [EndeavorHost.local, EndeavorHost.supabase],
  }),

  // -------------------------------------------------------- inconvenient

  /**
   * **Pathological shadow — empty identifier.** Two rows like this share a
   * shadow whose `sourceIdentifier` is `''`. They must never match each other:
   * *"Empty identifiers never match."*
   */
  emptyIdentifierShadowRow: makeEndeavor({
    id: 'orphan-a',
    title: 'Unlinked import',
    kind: EndeavorKind.task,
    hostedBy: [EndeavorHost.local],
    shadows: [
      makeShadow({
        originalTitle: 'Unlinked import',
        sourceIdentifier: '',
        kind: EndeavorKind.task,
        source: EndeavorHost.appleReminders,
        group: null,
      }),
    ],
  }),

  /**
   * **Pathological shadow — cross-provider twin.** Carries the *same*
   * identifier string as `enrichedLocalMirror`'s Apple shadow, but under
   * Google Calendar. *"Identifiers from different providers never collide."*
   */
  crossProviderTwinRow: makeEndeavor({
    id: 'google-twin',
    title: 'Unrelated Google item',
    kind: EndeavorKind.task,
    hostedBy: [EndeavorHost.local],
    shadows: [
      makeShadow({
        originalTitle: 'Unrelated Google item',
        sourceIdentifier: 'apple-vitamins',
        kind: EndeavorKind.task,
        source: EndeavorHost.googleCalendar,
        group: null,
      }),
    ],
  }),

  /**
   * **Pathological shadow — legacy, no priority evidence.** Predates provider
   * metadata persistence, so the non-series table cannot run and the stored
   * kind must stand: *"Kro keeps the last stored kind rather than inventing a
   * priority."*
   */
  legacyShadowRow: localMirrorRow({
    id: 'legacy-mirror',
    sourceIdentifier: 'apple-legacy',
    kind: EndeavorKind.reminder,
    priority: null,
  }),

  /**
   * **Pathological shadow — a multi-provider chain.** One row carrying three
   * shadows, two of them bridging providers, plus an empty one that must be
   * ignored. Exercises the identity index's dedupe and the union it produces.
   */
  multiShadowChainRow: makeEndeavor({
    id: 'chain-root',
    title: 'Cross-posted standup',
    kind: EndeavorKind.task,
    hostedBy: [EndeavorHost.local, EndeavorHost.supabase],
    shadows: [
      appleShadow({ sourceIdentifier: 'apple-chain', priority: 3 }),
      makeShadow({
        originalTitle: 'Cross-posted standup',
        sourceIdentifier: 'google-chain',
        kind: EndeavorKind.calendarEvent,
        source: EndeavorHost.googleCalendar,
        group: 'Work',
      }),
      makeShadow({
        originalTitle: 'Cross-posted standup',
        sourceIdentifier: '',
        kind: EndeavorKind.task,
        source: EndeavorHost.outlookCalendar,
        group: null,
      }),
    ],
  }),

  /**
   * **Pathological — a recurring calendar event.** Two occurrences of one
   * meeting share a calendar-item id and differ only by `start`, so identity
   * must be occurrence-scoped or a week's instances collapse into one.
   */
  recurringEventMondayRow: makeEndeavor({
    id: 'meeting-series',
    title: 'Weekly sync',
    kind: EndeavorKind.calendarEvent,
    start: utcAt(24, 15),
    duration: 1800,
    hostedBy: [EndeavorHost.googleCalendar],
  }),

  recurringEventTuesdayRow: makeEndeavor({
    id: 'meeting-series',
    title: 'Weekly sync',
    kind: EndeavorKind.calendarEvent,
    start: utcAt(25, 15),
    duration: 1800,
    hostedBy: [EndeavorHost.googleCalendar],
  }),

  /**
   * A tourist: hosted only externally, so Kro-specific fields have nowhere to
   * live until it is promoted.
   */
  googleTouristEvent: makeEndeavor({
    id: 'google-tourist',
    title: 'Dentist',
    kind: EndeavorKind.calendarEvent,
    start: utcAt(28, 10),
    hostedBy: [EndeavorHost.googleCalendar],
  }),

  /**
   * An enhanced row: an external original with a Kro overlay beside it. The
   * shape integrity rules 2, 3 and 4 all reason about.
   */
  enhancedAppleTask: makeEndeavor({
    id: 'enhanced-1',
    title: 'Renew passport',
    kind: EndeavorKind.task,
    due: utcAt(29, 9),
    value: 5,
    effort: 4,
    sessionPoints: 30,
    hostedBy: [EndeavorHost.local, EndeavorHost.appleReminders],
    shadows: [appleShadow({ sourceIdentifier: 'apple-passport', priority: 1 })],
  }),

  /** A performance, for the promotion and series-performance rules. */
  focusPerformance: makePerform({
    date: utcAt(26, 8),
    duration: 1500,
    resolution: PerformResolution.finished,
    rewardPoints: 25,
    completedAt: utcAt(26, 8, 25),
  }),
}

/**
 * The series scenario as one set: yesterday's completed occurrence (no
 * recurrence rule, as the provider emits it), today's live one (carrying the
 * rule), and Kro's enriched mirror still pointing at a retired identifier.
 */
export const seriesScenarioMocks = {
  completedYesterday: seriesOccurrenceRow({
    id: 'occurrence-25',
    day: 25,
    complete: true,
  }),
  liveToday: seriesOccurrenceRow({
    id: 'occurrence-26',
    day: 26,
    recurrence: recurrenceMocks.daily,
  }),
  enrichedMirror: seriesMirrorRow({
    id: 'mirror-vitamins',
    sourceIdentifier: 'occurrence-retired',
    value: 4,
  }),
}
