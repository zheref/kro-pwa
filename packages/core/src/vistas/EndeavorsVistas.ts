/**
 * `EndeavorsVistas` — canon `KroCore/Vistas/EndeavorsVistas.swift`.
 *
 * The central registry: one entry per screen, so any structural change to a
 * screen's data view is a single reviewable diff rather than an edit scattered
 * across a feature folder. Every query shape, capability order, lens `exposes`
 * set and presentation below is transcribed from the Swift source at
 * `zheref/KroApple@2c1ee45`; the PR body carries the entry-by-entry comparison.
 *
 * **Do is ONE vista.** `do.tab` fetches once; its on-screen lanes (overdue,
 * now, next, anytime, completed-today, all-day and timed events) are computed
 * in memory downstream by the Do shifters (#16). There is deliberately no
 * per-lane vista — canon decided that on 2026-06-06 and the doc records it.
 */
import { EndeavorKind } from '../domain/endeavor/EndeavorKind'
import { EndeavorStatus } from '../domain/endeavor/EndeavorStatus'
import { todayDateRange } from './DateRangeSpec'
import {
  EndeavorOperation,
  OperationRole,
  OperationTint,
  contextMenuGesture,
  makeEndeavorCapabilities,
  makeEndeavorOperationBinding,
  prepOverlayGesture,
  swipeLeadingGesture,
  swipeTrailingGesture,
  tapGesture,
} from './EndeavorCapabilities'
import { EndeavorGroupingCriteria } from './EndeavorCriteria'
import { UserFilter, makeEndeavorsLens } from './EndeavorsLens'
import { EndeavorPredicate } from './EndeavorPredicate'
import { everythingEndeavorsQuery, makeEndeavorsQuery } from './EndeavorsQuery'
import type { EndeavorsVista } from './EndeavorsVista'
import { makeEndeavorsVista } from './EndeavorsVista'
import {
  CardVariant,
  Density,
  makePresentationStyle,
} from './PresentationStyle'

/**
 * The `endeavorDetail` flag key, verbatim from canon. #11 owns the registry
 * that resolves it; here it is only the name a binding waits on.
 */
const ENDEAVOR_DETAIL_FLAG = 'endeavorDetail'

/**
 * Shared capability set for the Tasks-tab variants. Private in canon and
 * private here, for canon's stated reason: a future tweak (adding `archive`,
 * say) is one diff that updates every Tasks vista at once.
 */
const tasksCapabilities = makeEndeavorCapabilities([
  makeEndeavorOperationBinding({
    operation: EndeavorOperation.markComplete,
    gesture: swipeTrailingGesture,
    role: OperationRole.standard,
    icon: 'checkmark.circle',
    label: 'Complete',
  }),
  makeEndeavorOperationBinding({
    operation: EndeavorOperation.delete,
    gesture: swipeTrailingGesture,
    role: OperationRole.destructive,
    icon: 'trash',
    label: 'Delete',
  }),
  makeEndeavorOperationBinding({
    operation: EndeavorOperation.startSession,
    gesture: contextMenuGesture,
    role: OperationRole.standard,
    icon: 'play.circle',
    label: 'Start Session',
  }),
])

/** The presentation every Tasks-tab variant shares: 7 rows per group. */
const tasksPresentation = makePresentationStyle({
  cardVariant: CardVariant.standardRow,
  density: Density.regular,
  itemLimit: 7,
})

/** The lens every Tasks-tab variant shares, bar the seeded search query. */
const tasksLens = (searchQuery?: string) =>
  makeEndeavorsLens({
    searchQuery,
    grouping: EndeavorGroupingCriteria.status,
    exposes: [UserFilter.search, UserFilter.grouping],
  })

/**
 * The Find screen — the user's all-endeavors browser with rich filter UI. All
 * hosts, all kinds, all statuses by default; the user's toggles narrow.
 *
 * Gestures and tints mirror the Find rows exactly: leading swipe is Start
 * (green) then Edit (blue); trailing swipe is Delete (role-red) then Archive
 * (orange). Declaration order **is** the swipe-button order. The `viewDetail`
 * tap is dark-launched behind `endeavorDetail`.
 */
const find: EndeavorsVista = makeEndeavorsVista({
  id: 'find',
  title: 'Find',
  query: everythingEndeavorsQuery,
  lens: makeEndeavorsLens({
    grouping: EndeavorGroupingCriteria.status,
    sort: [],
    exposes: [
      UserFilter.kinds,
      UserFilter.hosts,
      UserFilter.statuses,
      UserFilter.search,
      UserFilter.showArchived,
    ],
  }),
  capabilities: makeEndeavorCapabilities([
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.startSession,
      gesture: swipeLeadingGesture,
      icon: 'play.fill',
      label: 'Start',
      tint: OperationTint.green,
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.edit,
      gesture: swipeLeadingGesture,
      icon: 'pencil',
      label: 'Edit',
      tint: OperationTint.blue,
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.delete,
      gesture: swipeTrailingGesture,
      role: OperationRole.destructive,
      icon: 'trash',
      label: 'Delete',
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.archive,
      gesture: swipeTrailingGesture,
      icon: 'archivebox',
      label: 'Archive',
      tint: OperationTint.orange,
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.viewDetail,
      gesture: tapGesture,
      icon: 'info.circle',
      label: 'View Detail',
      requires: ENDEAVOR_DETAIL_FLAG,
    }),
  ]),
  presentation: makePresentationStyle({
    cardVariant: CardVariant.standardRow,
    density: Density.regular,
  }),
})

/**
 * Tasks-tab default: every task across all hosts, grouped by status, seven
 * rows per group until one group is expanded.
 */
const tasksDefault: EndeavorsVista = makeEndeavorsVista({
  id: 'tasks.default',
  title: null,
  query: makeEndeavorsQuery({ kinds: [EndeavorKind.task] }),
  lens: tasksLens(),
  capabilities: tasksCapabilities,
  presentation: tasksPresentation,
})

/**
 * The "Today" tab — tasks whose `due` falls on today's calendar day, grouped by
 * section of day. The day filter is a **predicate**, not a date range: the
 * range would narrow the fetch, while `isDueToday` narrows what came back.
 */
const tasksToday: EndeavorsVista = makeEndeavorsVista({
  id: 'tasks.today',
  title: null,
  query: makeEndeavorsQuery({
    kinds: [EndeavorKind.task],
    predicates: [EndeavorPredicate.isDueToday],
  }),
  lens: makeEndeavorsLens({
    grouping: EndeavorGroupingCriteria.dueSection,
    exposes: [UserFilter.search, UserFilter.grouping],
  }),
  capabilities: tasksCapabilities,
  presentation: tasksPresentation,
})

/**
 * Tasks scoped to one list (a project, a reminders list). `listId` is the
 * list's stable id and becomes part of the vista id, so each list's saved lens
 * is its own.
 */
const tasksForList = (listId: string): EndeavorsVista =>
  makeEndeavorsVista({
    id: `tasks.list.${listId}`,
    title: null,
    query: makeEndeavorsQuery({
      kinds: [EndeavorKind.task],
      lists: [listId],
    }),
    lens: tasksLens(),
    capabilities: tasksCapabilities,
    presentation: tasksPresentation,
  })

/**
 * Tasks scoped to a search. The seed goes into the **lens**, not the query, so
 * the user can refine or clear it from the search field.
 */
const tasksForSearch = (query: string): EndeavorsVista =>
  makeEndeavorsVista({
    id: 'tasks.search',
    title: null,
    query: makeEndeavorsQuery({ kinds: [EndeavorKind.task] }),
    lens: tasksLens(query),
    capabilities: tasksCapabilities,
    presentation: tasksPresentation,
  })

/**
 * The Inbox — pending-triage tasks. `exposes` is **empty by design**: there is
 * nothing for the user to narrow, so there is nothing to persist or restore,
 * and the doc marks the Inbox exempt from saved lens preferences entirely.
 *
 * Triage is the Inbox's primary action and is surfaced as an explicit in-row
 * button, not a gesture — so it is intentionally absent from `capabilities`,
 * which drives the swipe adapter and here carries the trailing-swipe pair only.
 */
const inbox: EndeavorsVista = makeEndeavorsVista({
  id: 'inbox',
  title: 'Inbox',
  query: makeEndeavorsQuery({
    kinds: [EndeavorKind.task],
    statuses: [EndeavorStatus.pending],
  }),
  lens: makeEndeavorsLens({ exposes: [] }),
  capabilities: makeEndeavorCapabilities([
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.markComplete,
      gesture: swipeTrailingGesture,
      icon: 'checkmark.circle',
      label: 'Complete',
      tint: OperationTint.green,
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
    density: Density.compact,
  }),
})

/**
 * The Plan tab — today's events, rendered as a timeline. The lens exposes
 * calendar visibility (a concept it shares with Do) plus kind/host filters so
 * the user can hide whole sources.
 *
 * `edit` is deliberately absent: there is no endeavor editor in canon, so a
 * tap→edit binding would do nothing. The `viewDetail` tap that replaces it is
 * dark-launched behind `endeavorDetail`.
 */
const planDay: EndeavorsVista = makeEndeavorsVista({
  id: 'plan.day',
  title: null,
  query: makeEndeavorsQuery({
    kinds: [EndeavorKind.calendarEvent],
    dateRange: todayDateRange,
  }),
  lens: makeEndeavorsLens({
    showArchived: false,
    grouping: EndeavorGroupingCriteria.dueSection,
    exposes: [
      UserFilter.kinds,
      UserFilter.hosts,
      UserFilter.calendars,
      UserFilter.computedStates,
    ],
  }),
  capabilities: makeEndeavorCapabilities([
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.startSession,
      gesture: swipeLeadingGesture,
      role: OperationRole.standard,
      icon: 'play.circle',
      label: 'Start Session',
      tint: OperationTint.green,
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.delete,
      gesture: swipeTrailingGesture,
      role: OperationRole.destructive,
      icon: 'trash',
      label: 'Delete',
      tint: OperationTint.red,
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.startSession,
      gesture: contextMenuGesture,
      role: OperationRole.standard,
      icon: 'play.circle',
      label: 'Start Session',
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.delete,
      gesture: contextMenuGesture,
      role: OperationRole.destructive,
      icon: 'trash',
      label: 'Delete',
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.viewDetail,
      gesture: tapGesture,
      icon: 'info.circle',
      label: 'View Detail',
      requires: ENDEAVOR_DETAIL_FLAG,
    }),
  ]),
  presentation: makePresentationStyle({
    cardVariant: CardVariant.timelineBlock,
    density: Density.regular,
  }),
})

/**
 * The Do tab — today's tasks, reminders, events and habits in **one** fetch.
 * The shifters partition it downstream into the lanes; there is no per-lane
 * vista.
 *
 * The `includeArchived: true` / `showArchived: true` pair is the subtle part
 * and canon spells out why: without it the post-filter strips every closed and
 * skipped endeavor before the lens is ever consulted, so the completed-today
 * lane could only show what the user completed in the current session and would
 * empty again on the next refetch. Visibility of that lane is therefore
 * controlled by `hiddenComputedStates.completedToday`, not by the archive flag.
 *
 * Do open-codes its per-section operations rather than reading these bindings
 * (a completed row reopens; an event deletes differently from a task), so this
 * set is the declaration, not Do's runtime gesture source.
 */
const doTab: EndeavorsVista = makeEndeavorsVista({
  id: 'do.tab',
  title: null,
  query: makeEndeavorsQuery({
    kinds: [
      EndeavorKind.task,
      EndeavorKind.reminder,
      EndeavorKind.calendarEvent,
      EndeavorKind.habit,
    ],
    dateRange: todayDateRange,
    includeArchived: true,
  }),
  lens: makeEndeavorsLens({
    showArchived: true,
    grouping: EndeavorGroupingCriteria.status,
    exposes: [
      UserFilter.kinds,
      UserFilter.hosts,
      UserFilter.computedStates,
      UserFilter.calendars,
    ],
  }),
  capabilities: makeEndeavorCapabilities([
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.markComplete,
      gesture: tapGesture,
      role: OperationRole.standard,
      icon: 'checkmark.circle',
      label: 'Complete',
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.defer,
      gesture: contextMenuGesture,
      role: OperationRole.standard,
      icon: 'clock.arrow.circlepath',
      label: 'Defer',
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.delete,
      gesture: swipeTrailingGesture,
      role: OperationRole.destructive,
      icon: 'trash',
      label: 'Delete',
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.execute,
      gesture: prepOverlayGesture,
      role: OperationRole.standard,
      icon: 'bolt',
      label: 'Start now',
    }),
    makeEndeavorOperationBinding({
      operation: EndeavorOperation.dismissSuggestion,
      gesture: swipeTrailingGesture,
      role: OperationRole.destructive,
      icon: 'xmark',
      label: 'Dismiss',
    }),
  ]),
  presentation: makePresentationStyle({
    cardVariant: CardVariant.standardRow,
    density: Density.regular,
  }),
})

/**
 * Every vista the app surfaces. `tasksForList` and `tasksForSearch` are
 * parameterized, so they are functions here exactly as they are `static func`s
 * in canon; the rest are values.
 */
export const EndeavorsVistas = {
  find,
  tasksDefault,
  tasksToday,
  tasksForList,
  tasksForSearch,
  inbox,
  planDay,
  doTab,
} as const

/**
 * The registry's fixed entries, for a suite (or a filter sheet) that walks all
 * of them. The two parameterized entries are absent by construction — they have
 * no single value to list.
 */
export const fixedEndeavorsVistas: readonly EndeavorsVista[] = [
  find,
  tasksDefault,
  tasksToday,
  inbox,
  planDay,
  doTab,
]
