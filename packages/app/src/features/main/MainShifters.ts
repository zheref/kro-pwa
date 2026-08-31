/**
 * The shell's Shifters (`RC-4`, `RC-19`; implements `UZF-10`).
 *
 * Pure `with…(state, args) => MainState`. Every one returns a brand-new object
 * and reads nothing but its arguments — no clock, no flag service, no DOM.
 * Applied at the reducer arm as `Object.assign(state, withThing(state, …))`.
 */
import type { Project } from '@kro/core'
import type { DoSurface } from './DoSurfaceLayout'
import type { MainException } from './MainException'
import type { MainState, ShellRouteContext } from './MainFeature'
import type { DestinationGates } from './NavigationSections'
import type { SidebarDestination } from './SidebarDestination'

/** Loading started; any stale exception is cleared in the same move. */
export const withLoadingStarted = (state: MainState): MainState => ({
  ...state,
  load: { kind: 'loading' },
})

/** What one shell load installs. */
export interface ShellConfiguration {
  readonly gates: DestinationGates
  readonly projects: readonly Project[]
}

/**
 * The gates and the Lists rows, together.
 *
 * One Shifter rather than two because they arrive from one effect and are one
 * concern — "the shell now knows what it can show". Splitting them would let a
 * reducer install half a configuration.
 */
export const withShellLoaded = (
  state: MainState,
  configuration: ShellConfiguration,
): MainState => ({
  ...state,
  load: { kind: 'loaded' },
  gates: configuration.gates,
  projects: configuration.projects,
})

export const withException = (
  state: MainState,
  exception: MainException,
): MainState => ({
  ...state,
  load: { kind: 'failed', exception },
})

/**
 * The surface changed class.
 *
 * Deliberately touches one field. Acceptance criterion 2 — "resizing across
 * the breakpoint keeps state" — is this Shifter's signature: there is no
 * argument it could use to disturb `selected`.
 */
export const withSurfaceChanged = (
  state: MainState,
  surface: DoSurface,
): MainState => ({ ...state, surface })

/**
 * A destination became the selection.
 *
 * Selecting also closes the inline "New project…" row: canon's sidebar drops
 * the draft the moment focus leaves it, and leaving a half-typed row behind a
 * navigation is how a stale draft reappears three screens later.
 */
export const withDestinationSelected = (
  state: MainState,
  destination: SidebarDestination,
): MainState => ({
  ...state,
  selected: destination,
  isAddingProject: false,
  draftProjectTitle: '',
})

export const withSearchQueryChanged = (
  state: MainState,
  query: string,
): MainState => ({ ...state, searchQuery: query })

export const withDraftProjectStarted = (state: MainState): MainState => ({
  ...state,
  isAddingProject: true,
  draftProjectTitle: '',
})

export const withDraftProjectTitleEdited = (
  state: MainState,
  title: string,
): MainState => ({ ...state, draftProjectTitle: title })

export const withDraftProjectCancelled = (state: MainState): MainState => ({
  ...state,
  isAddingProject: false,
  draftProjectTitle: '',
})

/**
 * The Lists rows after a create.
 *
 * The draft row closes in the same move — the project it was standing in for
 * now exists, and leaving both on screen shows the same list twice.
 */
export const withProjectsInstalled = (
  state: MainState,
  projects: readonly Project[],
): MainState => ({
  ...state,
  load: { kind: 'loaded' },
  projects,
  isAddingProject: false,
  draftProjectTitle: '',
})

/**
 * A project row is gone.
 *
 * If it was the selection, the shell falls back to My Day rather than staying
 * pointed at a list that no longer exists — canon's sidebar does the same by
 * clearing the selection, and an empty selection here would leave the tab bar
 * with nothing highlighted.
 */
export const withProjectDeleted = (
  state: MainState,
  projects: readonly Project[],
): MainState => {
  const selected = state.selected
  const survives =
    selected.kind !== 'list' ||
    projects.some((project) => project.id === selected.listId)

  return {
    ...state,
    load: { kind: 'loaded' },
    projects,
    selected: survives ? selected : { kind: 'myDay' },
  }
}

/**
 * A capture's routing intent, delivered.
 *
 * Sets the selection *and* the one-shot in one move: the destination the
 * capture chose is now the selection, and the payload it carried (the day, the
 * scroll target, the just-created accent) waits for that surface to read it.
 */
export const withCaptureRouteConsumed = (
  state: MainState,
  context: ShellRouteContext,
): MainState => ({
  ...state,
  selected: context.destination,
  routeContext: context,
})
