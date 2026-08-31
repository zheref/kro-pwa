/**
 * `SidebarDestination` — canon `KroCore/Model/SidebarDestinationType.swift`.
 *
 * Canon's enum carries an associated value (`tasksWithFilter(filter:)`) that
 * covers three different things: a project list, a search, and a generic task
 * vista. Only the list case has an identity worth routing to, so the port is a
 * **discriminated union**: every destination is a plain tag except `list`,
 * which carries the project's id and title.
 *
 * Three naming decisions, all of them canon's, all of them deliberate:
 *
 * - **`title` vs `heading`.** Canon has both, and they differ: the sidebar row
 *   reads "Today" while the surface heading reads "My Day"; the row reads
 *   "Jot Down" while the heading reads "Inbox"; the row reads "Adjust" while
 *   the heading reads "Settings". Both are ported, and the shell uses `title`
 *   in navigation chrome and `heading` in content.
 * - **macOS naming is the web's naming.** Canon's `#if os(macOS)` branches
 *   give the Mac "Today"/"My Day" and "Execute"; the phone gets "Do". The web
 *   sidebar is the Mac's counterpart, so the macOS strings are the ones ported
 *   — including `session` reading "Execute" as a row and "Session" as a
 *   heading. The handheld tab bar is the iPhone's counterpart and uses the
 *   short tab labels (`tabLabel`).
 * - **"Priority Matrix", never "Triage".** Canon attaches a comment to this
 *   exact string: the standalone matrix board is an available-soon dead-end,
 *   distinct from the shipped Eisenhower-swipe flow reached from the Inbox,
 *   "must NOT read 'Triage' or it collides with that feature".
 */
import {
  Asterisk,
  BookOpen,
  CalendarRange,
  ClipboardList,
  Gift,
  Grid2x2,
  type LucideIcon,
  Search,
  Settings,
  Shapes,
  SlidersHorizontal,
  Sun,
  TimerReset,
  Watch,
} from 'lucide-react'
import { iconForSymbol } from '../../design/system/icons/icons'

/** Canon's cases, minus the ones no shipped surface routes to. */
export const DestinationKind = {
  /** `.doTab` — the landing destination. Row "Today", heading "My Day". */
  myDay: 'myDay',
  /** `.allTasks`. */
  allTasks: 'allTasks',
  /** `.inbox` — row "Jot Down", heading "Inbox". */
  inbox: 'inbox',
  /** `.matrix` — the standalone Priority Matrix board. */
  matrix: 'matrix',
  /** `.plan`. */
  plan: 'plan',
  /** `.habits`. */
  habits: 'habits',
  /** `.session` — row "Execute", heading "Session". */
  session: 'session',
  /** `.board`. */
  board: 'board',
  /** `.earn` — row "Earn", heading "Rewards". */
  earn: 'earn',
  /** `.blueprints`. */
  blueprints: 'blueprints',
  /** `.settings` — row "Adjust", heading "Settings". */
  settings: 'settings',
  /** `.dev` — "Tweak". Development builds only. */
  dev: 'dev',
  /** `.search`. */
  search: 'search',
  /** `.tasksWithFilter(.list(_))` — one project. */
  list: 'list',
} as const

export type DestinationKind =
  (typeof DestinationKind)[keyof typeof DestinationKind]

/** A destination with no associated value — canon's plain cases. */
export interface SimpleDestination {
  readonly kind: Exclude<DestinationKind, 'list'>
}

/** Canon's `.tasksWithFilter(filter: .list(list))`. */
export interface ListDestination {
  readonly kind: 'list'
  readonly listId: string
  readonly listTitle: string
}

export type SidebarDestination = SimpleDestination | ListDestination

/** Every non-list destination, in canon's declaration order. */
export const ALL_SIMPLE_DESTINATIONS: readonly SimpleDestination[] = [
  { kind: DestinationKind.myDay },
  { kind: DestinationKind.allTasks },
  { kind: DestinationKind.inbox },
  { kind: DestinationKind.matrix },
  { kind: DestinationKind.plan },
  { kind: DestinationKind.habits },
  { kind: DestinationKind.session },
  { kind: DestinationKind.board },
  { kind: DestinationKind.earn },
  { kind: DestinationKind.blueprints },
  { kind: DestinationKind.settings },
  { kind: DestinationKind.dev },
  { kind: DestinationKind.search },
]

/** Canon's `Hashable` identity, as a string a React key and a Selector can use. */
export const destinationId = (destination: SidebarDestination): string =>
  destination.kind === DestinationKind.list
    ? `list:${destination.listId}`
    : destination.kind

export const isSameDestination = (
  left: SidebarDestination,
  right: SidebarDestination,
): boolean => destinationId(left) === destinationId(right)

const SIMPLE_TITLES: Record<Exclude<DestinationKind, 'list'>, string> = {
  myDay: 'Today',
  allTasks: 'All Tasks',
  inbox: 'Jot Down',
  matrix: 'Priority Matrix',
  plan: 'Plan',
  habits: 'Habits',
  session: 'Execute',
  board: 'Board',
  earn: 'Earn',
  blueprints: 'Blueprints',
  settings: 'Adjust',
  dev: 'Tweak',
  search: 'Search',
}

const SIMPLE_HEADINGS: Record<Exclude<DestinationKind, 'list'>, string> = {
  myDay: 'My Day',
  allTasks: 'All Tasks',
  inbox: 'Inbox',
  matrix: 'Priority Matrix',
  plan: 'Plan',
  habits: 'Habits',
  session: 'Session',
  board: 'Board',
  earn: 'Rewards',
  blueprints: 'Blueprints',
  settings: 'Settings',
  dev: 'Tweak',
  search: 'Search',
}

/**
 * The short label the handheld tab bar uses — canon's `#if !os(macOS)` branch,
 * where `.doTab` reads "Do" rather than "Today".
 */
const TAB_LABELS: Partial<Record<Exclude<DestinationKind, 'list'>, string>> = {
  myDay: 'Do',
}

/** Canon's `var title` — the navigation row / tab label. */
export const destinationTitle = (destination: SidebarDestination): string =>
  destination.kind === DestinationKind.list
    ? destination.listTitle
    : SIMPLE_TITLES[destination.kind]

/** Canon's `var heading` — the content heading. */
export const destinationHeading = (destination: SidebarDestination): string =>
  destination.kind === DestinationKind.list
    ? destination.listTitle
    : SIMPLE_HEADINGS[destination.kind]

/** The tab bar's label: canon's iOS title, falling back to the shared one. */
export const destinationTabLabel = (
  destination: SidebarDestination,
): string =>
  destination.kind === DestinationKind.list
    ? destination.listTitle
    : (TAB_LABELS[destination.kind] ?? SIMPLE_TITLES[destination.kind])

/**
 * Canon's `var glyphName`, as the SF Symbol string, kept so the mapping to a
 * web icon is reviewable against canon by comparing two literal lists.
 *
 * `myDay` is the one deliberate divergence: canon's `.doTab` draws
 * `play.circle.fill`, and KC-IS-#13 prescribes `sun.max.fill` for the "My Day"
 * row (which is canon's own `.today` glyph, for the same heading). The issue's
 * table is the binding contract here, so the sun is what ships — recorded in
 * the delivery PR rather than left as a silent substitution.
 */
export const DESTINATION_SF_SYMBOL: Record<
  Exclude<DestinationKind, 'list'>,
  string
> = {
  myDay: 'sun.max.fill',
  allTasks: 'asterisk',
  inbox: 'tray.and.arrow.down.fill',
  matrix: 'square.split.2x2',
  plan: 'calendar.day.timeline.left',
  habits: 'watchface.applewatch.case',
  session: 'clock.arrow.trianglehead.counterclockwise.rotate.90',
  board: 'clipboard.fill',
  earn: 'gift.fill',
  blueprints:
    'chevron.compact.up.chevron.compact.right.chevron.compact.down.chevron.compact.left',
  settings: 'gear',
  dev: 'digitalcrown.arrow.clockwise.fill',
  search: 'magnifyingglass',
}

/**
 * The lucide component each destination draws.
 *
 * Where the design system's SF-Symbol vocabulary already carries the glyph it
 * is reused through `iconForSymbol` rather than restated; the rest are named
 * here because the shell is the first surface that needs them, and extending
 * `design/system/icons/icons.ts` is the design system's lane, not this one.
 * Folding these rows into that map is a follow-up, not a fork: the mapping
 * decision — 24px grid, 2px round-cap strokes, SF-shaped — is the same one.
 */
const SIMPLE_ICONS: Record<Exclude<DestinationKind, 'list'>, LucideIcon> = {
  myDay: Sun,
  allTasks: Asterisk,
  inbox: iconForSymbol('tray.and.arrow.down'),
  matrix: Grid2x2,
  plan: CalendarRange,
  habits: Watch,
  // Canon's `clock.arrow.trianglehead.counterclockwise.rotate.90` — a clock
  // with a counterclockwise rotate arrow. `TimerReset` is the same drawing.
  session: TimerReset,
  board: ClipboardList,
  earn: Gift,
  blueprints: Shapes,
  settings: Settings,
  dev: SlidersHorizontal,
  search: Search,
}

export const destinationIcon = (
  destination: SidebarDestination,
): LucideIcon =>
  destination.kind === DestinationKind.list
    ? BookOpen
    : SIMPLE_ICONS[destination.kind]

/**
 * Canon's `bottomEnforced` — the destinations pinned to the bottom of a
 * touch sidebar. Ported for completeness; the web sidebar expresses the same
 * intent with the Settings section's `shouldGoToBottom`.
 */
export const destinationBottomEnforced = (
  destination: SidebarDestination,
): boolean =>
  destination.kind === DestinationKind.earn ||
  destination.kind === DestinationKind.settings

/**
 * The route each destination owns.
 *
 * Paths follow canon's **macOS** naming, which is also what keeps the shell
 * off the two paths the pre-parity app still serves: canon calls the session
 * destination "Execute" (so `/execute`, leaving `/session` to the surface
 * KC-IS-#22 retires) and the settings destination "Adjust" (so `/adjust`,
 * leaving `/settings`). Neither is a workaround — both are the strings canon
 * puts in the sidebar.
 */
const SIMPLE_PATHS: Record<Exclude<DestinationKind, 'list'>, string> = {
  myDay: '/my-day',
  allTasks: '/tasks',
  inbox: '/inbox',
  matrix: '/matrix',
  plan: '/plan',
  habits: '/habits',
  session: '/execute',
  board: '/board',
  earn: '/earn',
  blueprints: '/blueprints',
  settings: '/adjust',
  dev: '/tweak',
  search: '/search',
}

export const destinationPath = (destination: SidebarDestination): string =>
  destination.kind === DestinationKind.list
    ? `/lists/${encodeURIComponent(destination.listId)}`
    : SIMPLE_PATHS[destination.kind]

/** The reverse of `destinationPath`, for a route file naming its own place. */
export const destinationForKind = (
  kind: Exclude<DestinationKind, 'list'>,
): SimpleDestination => ({ kind })
