/**
 * The navigation model — canon `KroCore/Domain/ElementsRepository.swift`'s
 * `ElementsLocal.retrieve(filter:)`, plus `MainScreen.phoneNavigationElements`.
 *
 * Canon builds the sidebar/tab set per operating system: `.macOS` and
 * `.ipadOS` produce the same three sections (the two files are byte-identical
 * in that branch), and `.iOS` produces one flat section the phone renders as a
 * tab bar. The web has exactly those two shapes — sidebar and tab bar — so the
 * two builders below are the `.macOS` and `.iOS` branches, ported gate for
 * gate.
 *
 * **Why a pure function taking gates instead of reading the flag service.**
 * Canon calls `Flags.shared.enabledResolver(...)` inline, which is a global.
 * Here the flags are a `FeatureFlagService` injected through `ThunkExtra`
 * (`RC-6`, `RC-21`), a Producer resolves them once, and this module takes the
 * answers. That keeps the model unit-testable without a service and keeps the
 * gate reads in the one place a Producer can inject a double.
 */
import type { Project } from '@kro/core'
import {
  DestinationKind,
  type ListDestination,
  type SidebarDestination,
  type SimpleDestination,
} from './SidebarDestination'

/**
 * The flag answers the navigation model needs, resolved once.
 *
 * One field per flag canon reads in this branch, named after the flag rather
 * than after the destination, so a reader can check them against
 * `FeatureFlags` without a translation step.
 */
export interface DestinationGates {
  /** `.tasks` — gates My Day, All Tasks and Jot Down. */
  readonly tasks: boolean
  /** `.matrix` — the standalone Priority Matrix board. */
  readonly matrix: boolean
  /** `.day` — Plan. */
  readonly day: boolean
  /** `.habits` */
  readonly habits: boolean
  /** `.session` — Execute. */
  readonly session: boolean
  /** `.board` */
  readonly board: boolean
  /** `.rewards` — Earn. */
  readonly rewards: boolean
  /** `.blueprints` */
  readonly blueprints: boolean
  /** `.settings` — Adjust. */
  readonly settings: boolean
  /** `.lists` — the whole Lists section. */
  readonly lists: boolean
  /** `.now` — canon picks `.doTab` over `.today` for the phone's initial tab. */
  readonly now: boolean
}

/**
 * Every gate closed.
 *
 * Seeded shut rather than at the shipping baseline, for the reason canon gives
 * for the Do surface's own flags: the pre-flag-read first render must not
 * flash a destination the build has staged off. The Producer resolves the real
 * answers synchronously on mount.
 */
export const closedDestinationGates: DestinationGates = {
  tasks: false,
  matrix: false,
  day: false,
  habits: false,
  session: false,
  board: false,
  rewards: false,
  blueprints: false,
  settings: false,
  lists: false,
  now: false,
}

/** Canon's `NavigationElement`. */
export interface NavigationElement {
  readonly destination: SidebarDestination
  /** Canon's `isInitial` — the destination the shell lands on. */
  readonly isInitial: boolean
}

/** Canon's `NavigationElementSection`. */
export interface NavigationSection {
  /**
   * Canon's `title`, whose sentinel `"default"` means "render this section
   * without a header". Kept as `null` here: an untitled section is the absence
   * of a title, and a magic string that must never be rendered is a trap.
   */
  readonly title: string | null
  /** Canon's `shouldGoToBottom` — the Settings section pins to the bottom. */
  readonly shouldGoToBottom: boolean
  readonly elements: readonly NavigationElement[]
}

const element = (
  destination: SidebarDestination,
  isInitial = false,
): NavigationElement => ({ destination, isInitial })

const simple = (kind: SimpleDestination['kind']): SimpleDestination => ({
  kind,
})

/** Canon's `section.add(element:if:)` — append only when the gate is open. */
const addIf = (
  into: NavigationElement[],
  gate: boolean,
  destination: SidebarDestination,
  isInitial = false,
): void => {
  if (gate) into.push(element(destination, isInitial))
}

export interface NavigationModelInput {
  readonly gates: DestinationGates
  /**
   * Canon's `#if DEBUG` around the `.dev` ("Tweak") row. There is no build
   * configuration in a platform-free tier, so the answer is supplied by the
   * composition root — the same call `FeatureFlagBaseline` already makes for
   * `developmentActions`.
   */
  readonly isDevelopment: boolean
  /** Canon's `store.lists` — the projects the Lists section renders. */
  readonly projects: readonly Project[]
  /** Canon's `store.isAddingNewProject` — the inline "New project…" row. */
  readonly isAddingProject: boolean
}

/**
 * The sidebar's sections — canon's `.macOS` branch.
 *
 * Order and gating are canon's, element for element:
 *
 *   untitled  My Day (isInitial, `.tasks`) · All Tasks (`.tasks`)
 *   Workflow  Jot Down (`.tasks`) · Priority Matrix (`.matrix`) ·
 *             Plan (`.day`) · Habits (`.habits`) · Execute (`.session`) ·
 *             Board (`.board`) · Earn (`.rewards`)
 *   Settings  Blueprints (`.blueprints`) · Adjust (`.settings`) ·
 *             Tweak (development only)          [shouldGoToBottom]
 *   Lists     one row per project, `.lists`     [when non-empty or adding]
 *
 * An empty section is dropped, exactly as canon drops one whose
 * `elements.count == 0`.
 */
export const sidebarSections = (
  input: NavigationModelInput,
): readonly NavigationSection[] => {
  const { gates } = input

  const defaultElements: NavigationElement[] = []
  addIf(defaultElements, gates.tasks, simple(DestinationKind.myDay), true)
  addIf(defaultElements, gates.tasks, simple(DestinationKind.allTasks))

  const workflowElements: NavigationElement[] = []
  addIf(workflowElements, gates.tasks, simple(DestinationKind.inbox))
  addIf(workflowElements, gates.matrix, simple(DestinationKind.matrix))
  addIf(workflowElements, gates.day, simple(DestinationKind.plan))
  addIf(workflowElements, gates.habits, simple(DestinationKind.habits))
  addIf(workflowElements, gates.session, simple(DestinationKind.session))
  addIf(workflowElements, gates.board, simple(DestinationKind.board))
  addIf(workflowElements, gates.rewards, simple(DestinationKind.earn))

  const settingsElements: NavigationElement[] = []
  addIf(settingsElements, gates.blueprints, simple(DestinationKind.blueprints))
  addIf(settingsElements, gates.settings, simple(DestinationKind.settings))
  addIf(settingsElements, input.isDevelopment, simple(DestinationKind.dev))

  const listElements: NavigationElement[] = input.projects.map((project) =>
    element(listDestination(project)),
  )

  const sections: NavigationSection[] = []
  if (defaultElements.length > 0) {
    sections.push({
      title: null,
      shouldGoToBottom: false,
      elements: defaultElements,
    })
  }
  if (workflowElements.length > 0) {
    sections.push({
      title: 'Workflow',
      shouldGoToBottom: false,
      elements: workflowElements,
    })
  }
  if (settingsElements.length > 0) {
    sections.push({
      title: 'Settings',
      shouldGoToBottom: true,
      elements: settingsElements,
    })
  }
  // Canon: the Lists section renders only when the flag is on AND there is
  // something to render — a project, or the inline row being typed into.
  if (gates.lists && (input.isAddingProject || input.projects.length > 0)) {
    sections.push({
      title: 'Lists',
      shouldGoToBottom: false,
      elements: listElements,
    })
  }

  return sections
}

/** One project, as a destination. */
export const listDestination = (project: Project): ListDestination => ({
  kind: DestinationKind.list,
  listId: project.id,
  listTitle: project.title,
})

/**
 * The handheld tab bar — canon's `.iOS` branch, then
 * `MainScreen.phoneNavigationElements`.
 *
 * Canon builds one flat section — Plan (`.day`), Priority Matrix (`.matrix`),
 * the initial tab, Earn (`.rewards`) — and the Screen then **filters
 * `.matrix` out** with the comment: "iPhone tabs deliberately exclude the
 * legacy Priority Matrix entry. The full navigation set remains available to
 * the iPadOS and macOS sidebars". Both steps are ported: the matrix gate is
 * evaluated and then discarded, so if the filter is ever lifted the gate is
 * already in the right place.
 *
 * The initial tab is `.doTab` when `.now` is enabled and the date-filtered
 * task list otherwise; the web has one My Day destination for both, so the
 * fallback resolves to the same destination behind the `.tasks` gate — which
 * is canon's `.today`, same title, same heading.
 */
export const tabBarElements = (
  gates: DestinationGates,
): readonly NavigationElement[] => {
  const elements: NavigationElement[] = []

  addIf(elements, gates.day, simple(DestinationKind.plan))
  addIf(elements, gates.matrix, simple(DestinationKind.matrix))

  if (gates.now) {
    addIf(elements, gates.now, simple(DestinationKind.myDay), true)
  } else {
    addIf(elements, gates.tasks, simple(DestinationKind.myDay), true)
  }

  addIf(elements, gates.rewards, simple(DestinationKind.earn))

  // `MainScreen.phoneNavigationElements` — the standalone matrix never
  // becomes a tab.
  return elements.filter(
    (candidate) => candidate.destination.kind !== DestinationKind.matrix,
  )
}

/**
 * The Search affordance the phone carries beside its tabs — canon's
 * `Tab(value: .search, role: .search)`, which is a leading search button
 * rather than an ordinary tab. It is not part of `tabBarElements` for the same
 * reason: it is chrome with its own role, and folding it into the tab list
 * would make it sort and highlight like one.
 */
export const searchDestination: SimpleDestination = {
  kind: DestinationKind.search,
}

/** Every destination the model can currently reach, flattened. */
export const flattenSections = (
  sections: readonly NavigationSection[],
): readonly NavigationElement[] =>
  sections.flatMap((section) => section.elements)

/** Canon's `isInitial` element, or `null` when every gate is shut. */
export const initialElement = (
  elements: readonly NavigationElement[],
): NavigationElement | null =>
  elements.find((candidate) => candidate.isInitial) ?? null
