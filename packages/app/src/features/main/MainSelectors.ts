/**
 * The shell's Selectors (`RC-5`, `RC-20`; implements `UZF-11`).
 *
 * Every adaptive answer the shell renders is derived here, from the resolved
 * `surface` in state through the ported decision table — never re-derived in a
 * component and never read from a media query at a call site. That is what
 * makes "matching canon's table cell-for-cell" checkable through the store.
 *
 * One cross-slice read lives here, and it is the sanctioned form: `RC-20` says
 * cross-slice reads "compose through Selectors built at the root level — never
 * by importing another feature's slice/state shape directly", so
 * `selectPendingShellRoute` composes capture's own exported Selector and
 * reshapes its result into a shell-owned type. No shell type names a capture
 * type, and nothing here reads `state.capture` itself.
 */
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../library/store'
import {
  type DoSurfaceLayout,
  type ShellShape,
  doSurfaceLayout,
  shellShapeFor,
} from './DoSurfaceLayout'
import { selectCaptureNavigationIntent } from '../capture/CaptureSelectors'
import type { MainException } from './MainException'
import type {
  MainState,
  PendingShellRoute,
  ShellRouteContext,
} from './MainFeature'
import {
  type NavigationElement,
  type NavigationSection,
  flattenSections,
  sidebarSections,
  tabBarElements,
} from './NavigationSections'
import {
  DestinationKind,
  type SidebarDestination,
  destinationHeading,
  destinationTitle,
  isSameDestination,
} from './SidebarDestination'

const selectMainSlice = (state: RootState): MainState => state.main

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const selectIsShellLoading = createSelector(
  [selectMainSlice],
  (slice) => slice.load.kind === 'loading',
)

export const selectShellException = createSelector(
  [selectMainSlice],
  (slice): MainException | null =>
    slice.load.kind === 'failed' ? slice.load.exception : null,
)

// ---------------------------------------------------------------------------
// The decision table
// ---------------------------------------------------------------------------

export const selectSurface = createSelector(
  [selectMainSlice],
  (slice) => slice.surface,
)

/** The resolved row of canon's table for the surface we are on. */
export const selectLayout = createSelector(
  [selectSurface],
  (surface): DoSurfaceLayout => doSurfaceLayout(surface),
)

/** Tab bar or sidebar — the web's two shells. */
export const selectShellShape = createSelector(
  [selectSurface],
  (surface): ShellShape => shellShapeFor(surface),
)

/**
 * Whether the *shell* owns Profile and Inbox.
 *
 * Canon's ownership rule, read straight off the table: a layout with a tab bar
 * omits them from its headers because the tab installs them once; a sidebar
 * shell owns them at any width because nothing else would.
 */
export const selectShellOwnsProfileControls = createSelector(
  [selectLayout],
  (layout) => layout.showsProfileControl,
)

// ---------------------------------------------------------------------------
// The navigation model
// ---------------------------------------------------------------------------

const selectGates = createSelector([selectMainSlice], (slice) => slice.gates)

export const selectProjects = createSelector(
  [selectMainSlice],
  (slice) => slice.projects,
)

export const selectIsAddingProject = createSelector(
  [selectMainSlice],
  (slice) => slice.isAddingProject,
)

export const selectDraftProjectTitle = createSelector(
  [selectMainSlice],
  (slice) => slice.draftProjectTitle,
)

export const selectSearchQuery = createSelector(
  [selectMainSlice],
  (slice) => slice.searchQuery,
)

export const selectIsSidebarVisible = createSelector(
  [selectMainSlice],
  (slice) => slice.isSidebarVisible,
)

/**
 * Whether the "+" and the per-row delete are offerable at all — canon gates
 * both on `lists`, the same flag that gates the section itself.
 */
export const selectCanManageProjects = createSelector(
  [selectGates],
  (gates) => gates.lists,
)

/** The sidebar's sections — canon's `.macOS` branch, gates applied. */
export const selectSidebarSections = createSelector(
  [selectMainSlice],
  (slice): readonly NavigationSection[] =>
    sidebarSections({
      gates: slice.gates,
      isDevelopment: slice.isDevelopment,
      projects: slice.projects,
      isAddingProject: slice.isAddingProject,
    }),
)

/** The handheld tabs — canon's `.iOS` branch, matrix filtered out. */
export const selectTabBarElements = createSelector(
  [selectGates],
  (gates): readonly NavigationElement[] => tabBarElements(gates),
)

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export const selectSelectedDestination = createSelector(
  [selectMainSlice],
  (slice): SidebarDestination => slice.selected,
)

/** The navigation row's copy — canon's `title` ("Today", "Jot Down", …). */
export const selectSelectedTitle = createSelector(
  [selectSelectedDestination],
  (destination) => destinationTitle(destination),
)

/** The content heading — canon's `heading` ("My Day", "Inbox", …). */
export const selectSelectedHeading = createSelector(
  [selectSelectedDestination],
  (destination) => destinationHeading(destination),
)

/**
 * Whether the selection is reachable in the current model.
 *
 * A flag can close a destination out from under a selection (an override
 * flipped, a sign-out), and the shell should notice rather than highlight a
 * row that is not rendered.
 */
export const selectIsSelectionReachable = createSelector(
  [selectSidebarSections, selectTabBarElements, selectSelectedDestination],
  (sections, tabs, selected) =>
    [...flattenSections(sections), ...tabs].some((element) =>
      isSameDestination(element.destination, selected),
    ),
)

// ---------------------------------------------------------------------------
// The capture one-shot — the one cross-slice read (RC-20)
// ---------------------------------------------------------------------------

/**
 * The capture slice's pending routing intent, in shell terms.
 *
 * Composed from capture's own Selector, then reshaped: the destination the
 * shell would select, the payload the surface will want (canon seeds exactly
 * these onto `PlanFeature.State`), whether performing it may move the user, and
 * the absolute instant the wait is over.
 *
 * `autoNavigates` is the Plan branch and only the Plan branch, which is the
 * capture rules' own sentence: an event going to Plan is *"the only path that
 * auto-navigates a captured endeavor away from the Inbox"*, and everything else
 * *"opens the Inbox and never auto-navigates"*. The distinction has to be made
 * HERE because this is the one place that still knows which branch the intent
 * came from — one step later it is a `SidebarDestination` like any other, and
 * the Inbox is also an ordinary destination a user can navigate to on purpose.
 */
export const selectPendingShellRoute = createSelector(
  [selectCaptureNavigationIntent],
  (intent): PendingShellRoute | null => {
    if (intent === null) return null

    const route = intent.route
    const isPlan = route.kind === 'plan'
    const context: ShellRouteContext = {
      destination: {
        kind: isPlan ? DestinationKind.plan : DestinationKind.inbox,
      },
      endeavorId: route.endeavorId,
      day: isPlan ? route.day : null,
      scrollTarget: isPlan ? route.scrollTarget : null,
      highlight: isPlan ? route.highlight : false,
      listMode: isPlan ? route.listMode : false,
      autoNavigates: isPlan,
    }

    return {
      context,
      deliverAtMs: intent.decidedAt.getTime() + intent.deliverAfterMs,
    }
  },
)

/** The one-shot a destination's surface reads once it has been routed to. */
export const selectShellRouteContext = createSelector(
  [selectMainSlice],
  (slice): ShellRouteContext | null => slice.routeContext,
)
