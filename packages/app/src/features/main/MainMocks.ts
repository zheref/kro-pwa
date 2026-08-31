/**
 * Canned shell states (`RC-31`; implements `UZF-18`).
 *
 * Every story and every render test reads from here — a `MainState` is never
 * constructed inline, not even for a one-off scenario. Each variant is built
 * from the slice's own `getInitialState()`, so a field added to the state
 * shape reaches every scenario at once.
 *
 * The gate sets are the two that matter in review: `statusQuoGates` is what
 * ships (matrix, habits, board and blueprints closed — the four flags
 * `statusQuoSet` leaves unassigned or disabled), and `allOpenGates` is what a
 * development build sees. Reading the two side by side is how "flag-gated
 * destination visibility matches canon" is checked.
 */
import { makeProject } from '@kro/core'
import {
  DoSurfaceIdiom,
  DoSurfaceWidth,
  type DoSurface,
} from './DoSurfaceLayout'
import { type MainState, mainSlice } from './MainFeature'
import type { DestinationGates } from './NavigationSections'
import { DestinationKind } from './SidebarDestination'

const base = mainSlice.getInitialState()

/** The shipping baseline, read off `FeatureFlagAssignment.statusQuoSet`. */
export const statusQuoGates: DestinationGates = {
  tasks: true,
  matrix: false,
  day: true,
  habits: false,
  session: true,
  board: false,
  rewards: true,
  blueprints: false,
  settings: true,
  lists: true,
  now: true,
}

/** Every gate open — the `allEnabled` baseline. */
export const allOpenGates: DestinationGates = {
  tasks: true,
  matrix: true,
  day: true,
  habits: true,
  session: true,
  board: true,
  rewards: true,
  blueprints: true,
  settings: true,
  lists: true,
  now: true,
}

export const projectMocks = {
  inbox: makeProject({ id: 'p-1', title: 'Home' }),
  work: makeProject({ id: 'p-2', title: 'Work' }),
  unicode: makeProject({ id: 'p-3', title: '家 · 仕事 🌸' }),
  long: makeProject({
    id: 'p-4',
    title: 'A project title long enough to need truncation in a 200px column',
  }),
}

/** The desktop surface: pointer-driven, regular width. */
export const desktopSurface: DoSurface = {
  idiom: DoSurfaceIdiom.desktop,
  width: DoSurfaceWidth.regular,
}

/** The handheld surface: a phone-width window. */
export const handheldSurface: DoSurface = {
  idiom: DoSurfaceIdiom.handheld,
  width: DoSurfaceWidth.compact,
}

/** A landscape tablet: touch targets, sidebar shell. */
export const tabletSurface: DoSurface = {
  idiom: DoSurfaceIdiom.tablet,
  width: DoSurfaceWidth.regular,
}

export const MainMocks = {
  /** Before the flags resolve: every gate shut, nothing rendered yet. */
  idle: base,

  /** The shipping desktop sidebar. */
  desktopLoaded: {
    ...base,
    load: { kind: 'loaded' },
    surface: desktopSurface,
    gates: statusQuoGates,
    projects: [projectMocks.inbox, projectMocks.work],
  } satisfies MainState as MainState,

  /** The shipping phone tab bar, on the same selection. */
  handheldLoaded: {
    ...base,
    load: { kind: 'loaded' },
    surface: handheldSurface,
    gates: statusQuoGates,
    projects: [projectMocks.inbox, projectMocks.work],
  } satisfies MainState as MainState,

  /** A development build: every destination visible, Tweak included. */
  desktopAllFlags: {
    ...base,
    load: { kind: 'loaded' },
    surface: desktopSurface,
    gates: allOpenGates,
    isDevelopment: true,
    projects: [projectMocks.inbox, projectMocks.work, projectMocks.unicode],
  } satisfies MainState as MainState,

  /** No projects yet, and the inline "New project…" row is open. */
  desktopAddingProject: {
    ...base,
    load: { kind: 'loaded' },
    surface: desktopSurface,
    gates: statusQuoGates,
    isAddingProject: true,
    draftProjectTitle: 'Groceries',
  } satisfies MainState as MainState,

  /** A different destination is selected — Plan, not My Day. */
  desktopOnPlan: {
    ...base,
    load: { kind: 'loaded' },
    surface: desktopSurface,
    gates: statusQuoGates,
    selected: { kind: DestinationKind.plan },
    projects: [projectMocks.inbox],
  } satisfies MainState as MainState,

  /** The Lists read failed; the rest of the sidebar still renders. */
  desktopListsFailed: {
    ...base,
    load: {
      kind: 'failed',
      exception: {
        kind: 'listsLoadFailed',
        message: "Couldn't load your lists: the database is closed",
        recoverable: true,
      },
    },
    surface: desktopSurface,
    gates: statusQuoGates,
  } satisfies MainState as MainState,

  /** The sidebar is collapsed — canon's `splitVisibility`. */
  desktopSidebarHidden: {
    ...base,
    load: { kind: 'loaded' },
    surface: desktopSurface,
    gates: statusQuoGates,
    isSidebarVisible: false,
  } satisfies MainState as MainState,
}
