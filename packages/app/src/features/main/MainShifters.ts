/**
 * The shell's Shifters (`RC-4`, `RC-19`; implements `UZF-10`).
 *
 * Pure `with…(state, args) => MainState`. Every one returns a brand-new object
 * and reads nothing but its arguments — no clock, no flag service, no DOM.
 * Applied at the reducer arm as `Object.assign(state, withThing(state, …))`.
 */
import type { Project } from '@kro/core'
import type {
  DetailPaneEndeavor,
  DetailPaneLocation,
  DetailPaneSegment,
} from './DetailPane'
import { type DoSurface, shellShapeFor } from './DoSurfaceLayout'
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
  /**
   * The Lists read's failure, when the flags resolved but the store did not:
   * gates always apply — a sidebar with no destinations because the Lists
   * section could not be read would hide the whole app behind one section's
   * failure.
   */
  readonly listsFailure?: MainException | null
  /** Canon's `isMacDetailPaneEnabled` — the `macDetailPane` flag's answer. */
  readonly isDetailPaneEnabled?: boolean
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
  load:
    configuration.listsFailure == null
      ? { kind: 'loaded' }
      : { kind: 'failed', exception: configuration.listsFailure },
  gates: configuration.gates,
  projects: configuration.projects,
  isDetailPaneEnabled: configuration.isDetailPaneEnabled ?? false,
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
 * Sets the one-shot always, and the selection only when the route is one that
 * may move the user. The payload it carried (the day, the scroll target, the
 * just-created accent) waits for the receiving surface to read it either way.
 *
 * The selection is half of "auto-navigating": pushing `/inbox` moves the
 * browser, and re-selecting the Inbox moves the shell's own highlight and
 * body. A route the capture rules say never auto-navigates must do neither, so
 * both halves read the same `autoNavigates` flag rather than each deciding for
 * itself.
 */
export const withCaptureRouteConsumed = (
  state: MainState,
  context: ShellRouteContext,
): MainState => ({
  ...state,
  selected: context.autoNavigates ? context.destination : state.selected,
  routeContext: context,
})

// ---------------------------------------------------------------------------
// The trailing detail pane — canon's `applyDetailPane…` family
// ---------------------------------------------------------------------------

/**
 * Canon's `applyDetailPaneSegmentSelected`: shows `segment`, or hides the pane
 * when that segment is already showing — the toolbar's deselect gesture.
 *
 * The endeavor is kept either way, so the other segments read the same one.
 */
export const withDetailPaneSegmentSelected = (
  state: MainState,
  segment: DetailPaneSegment,
): MainState => ({
  ...state,
  detailPane: {
    ...state.detailPane,
    segment: state.detailPane.segment === segment ? null : segment,
  },
  // A toolbar choice is top-level navigation: any drill-in trail is dropped.
  detailPaneBackStack: [],
})

/**
 * Canon's `applyDetailPaneEndeavorSelected`: points the pane at `endeavor`
 * (or at the whole day, with `null`) and shows `segment` in that mode.
 *
 * Invariant: the selection and the segment change together — swapping the
 * endeavor alone would leave the pane showing the previous endeavor's reading
 * under the new one's title.
 */
export const withDetailPaneEndeavorSelected = (
  state: MainState,
  endeavor: DetailPaneEndeavor | null,
  segment: DetailPaneSegment,
): MainState => ({
  ...state,
  detailPane: { segment, endeavor },
  detailPaneBackStack: [],
})

/**
 * Canon's `applyDetailPaneDismissed`: hides the pane. The endeavor stays, as
 * canon's `detailPaneEndeavor` does, so the toolbar reopens the same reading.
 */
export const withDetailPaneDismissed = (state: MainState): MainState => ({
  ...state,
  detailPane: { ...state.detailPane, segment: null },
  detailPaneBackStack: [],
})

/**
 * A drill-in: the pane moves to `location` and remembers where it was, so its
 * header offers Back instead of Close. The generic push behind every
 * "open this from inside the pane" (Session's Show sessions, first).
 *
 * Drilling from a hidden pane is a plain open — there is nowhere to go back to.
 */
export const withDetailPaneDrilledIn = (
  state: MainState,
  location: DetailPaneLocation,
): MainState => {
  const { segment, endeavor } = state.detailPane
  return {
    ...state,
    detailPane: { segment: location.segment, endeavor: location.endeavor },
    detailPaneBackStack:
      segment === null
        ? []
        : [...state.detailPaneBackStack, { segment, endeavor }],
  }
}

/** Back: the pane returns to where the last drill-in left from. */
export const withDetailPaneWentBack = (state: MainState): MainState => {
  const previous = state.detailPaneBackStack.at(-1)
  if (previous === undefined) return state
  return {
    ...state,
    detailPane: { segment: previous.segment, endeavor: previous.endeavor },
    detailPaneBackStack: state.detailPaneBackStack.slice(0, -1),
  }
}

/**
 * Whether this shell hosts the trailing pane at all — the flag is on and the
 * surface resolves to the sidebar shell. The reducer-tier twin of
 * `selectIsDetailPaneAvailable`, so a cross-slice arm can gate on it without a
 * Selector (a reducer never reads `RootState`).
 */
export const isDetailPaneHost = (state: MainState): boolean =>
  state.isDetailPaneEnabled && shellShapeFor(state.surface) === 'sidebar'

/**
 * Endeavor Detail opened on `endeavor` — canon's `paneEndeavorDetail` mount:
 * on a pane host the pane's Plan points at it. Elsewhere Detail is a dialog or
 * a sheet, and the pane is left exactly as it was.
 */
export const withDetailPaneFollowingDetail = (
  state: MainState,
  endeavor: DetailPaneEndeavor,
): MainState =>
  isDetailPaneHost(state)
    ? withDetailPaneEndeavorSelected(state, endeavor, 'plan')
    : state

/**
 * Endeavor Detail closed from inside (its own dismiss, a delete). Where the
 * pane was showing it on Plan, the pane hides with it — canon's *"exactly one
 * content is mounted at a time"*: an empty Plan has nothing to show.
 */
export const withDetailPaneReleasedByDetail = (state: MainState): MainState =>
  isDetailPaneHost(state) && state.detailPane.segment === 'plan'
    ? withDetailPaneDismissed(state)
    : state

/**
 * A countdown ended and the pane should raise Session for it — canon's
 * `applySessionSetupPresentation`, system-originated. A no-op off a pane host,
 * where the session raises its own surface instead.
 */
export const withDetailPaneSessionRaised = (
  state: MainState,
  endeavor: DetailPaneEndeavor | null,
): MainState =>
  isDetailPaneHost(state)
    ? withDetailPaneEndeavorSelected(state, endeavor, 'sessionSetup')
    : state
