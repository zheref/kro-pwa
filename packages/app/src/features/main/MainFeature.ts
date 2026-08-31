/**
 * The shell slice (`RC-1`, `RC-2`, `RC-24`, `RC-36`) — canon
 * `Kro/Application/Main/MainFeature.swift`, reduced to what the navigation
 * shell itself owns.
 *
 * Canon's `MainFeature` is the whole app's root reducer: it holds the endeavor
 * pool, every child feature's state and the routing. Here the pool and the
 * children are their own slices already, so this one keeps exactly the shell's
 * concerns — which surface we are on, which destination is selected, which
 * destinations exist, and the Lists section's rows.
 *
 * **The surface lives in state on purpose.** It is the resolved `idiom x
 * width` pair, not a raw viewport: a Selector can then answer "sidebar or tab
 * bar", "expanded day title or short date", "44px or 28px" by reading the
 * ported decision table, and every one of those answers is testable through
 * the store rather than through a browser. The hook that observes the browser
 * dispatches only when the pair actually changes, so a drag-resize is one
 * dispatch per crossing, not one per frame.
 *
 * **Selection survives a shell swap by construction.** `selected` is a field
 * of this slice, and the tab bar and the sidebar both read it; swapping shells
 * changes which Fragment renders, not what is selected. Acceptance criterion 2
 * is therefore a property of the state shape rather than of a component.
 */
import type { Project } from '@kro/core'
import { type PayloadAction, createSlice } from '@reduxjs/toolkit'
import {
  type DoSurface,
  SSR_DEFAULT_SURFACE,
} from './DoSurfaceLayout'
import type { MainException } from './MainException'
import { MainExceptions } from './MainException'
import {
  createProjectThunk,
  deleteProjectThunk,
  deliverCaptureRouteThunk,
  loadShellThunk,
} from './MainProducer'
import {
  type DestinationGates,
  closedDestinationGates,
} from './NavigationSections'
import {
  DestinationKind,
  type SidebarDestination,
} from './SidebarDestination'
import {
  withCaptureRouteConsumed,
  withDestinationSelected,
  withDraftProjectCancelled,
  withDraftProjectStarted,
  withDraftProjectTitleEdited,
  withException,
  withLoadingStarted,
  withProjectDeleted,
  withProjectsInstalled,
  withSearchQueryChanged,
  withShellLoaded,
  withSurfaceChanged,
} from './MainShifters'

/** The one lifecycle field (`RC-24`, `UZF-9`). */
export type MainLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'failed'; readonly exception: MainException }

/**
 * What the shell hands a destination's surface once a capture has routed it
 * there — canon seeds these straight onto `PlanFeature.State`.
 *
 * Declared here rather than imported from the capture feature: `RC-20` keeps
 * one slice out of another's shape, and the Producer that reads capture's
 * intent maps it into this shell-owned type at the boundary. A Plan surface
 * (KC-IS-#18) reads it through `selectShellRouteContext` and clears nothing —
 * the shell owns the one-shot.
 */
export interface ShellRouteContext {
  readonly destination: SidebarDestination
  /** The endeavor the capture created, for the just-created row accent. */
  readonly endeavorId: string
  /** Canon's `selectedDate` — the day the surface should show. */
  readonly day: Date | null
  /** Canon's `scrollTarget` — the moment to bring into view. */
  readonly scrollTarget: Date | null
  /** The bluish just-created accent. */
  readonly highlight: boolean
  /** Open the day in the chronological list rather than the timeline. */
  readonly listMode: boolean
}

/**
 * A capture's routing intent, reshaped into shell terms and not yet due.
 *
 * `deliverAtMs` is the absolute instant the capture slice's `decidedAt +
 * deliverAfterMs` resolves to. Carrying the answer rather than the two
 * operands is what lets the shell decide dueness without re-implementing the
 * capture feature's policy — and without naming one of its types.
 */
export interface PendingShellRoute {
  readonly context: ShellRouteContext
  readonly deliverAtMs: number
}

export interface MainState {
  readonly load: MainLoadState
  /** The resolved `idiom x width` pair the decision table reads. */
  readonly surface: DoSurface
  /** Canon's `selectedElement`. The initial destination is My Day. */
  readonly selected: SidebarDestination
  /** The resolved flag answers the navigation model gates on. */
  readonly gates: DestinationGates
  /** Canon's `#if DEBUG` for the Tweak row, supplied by the shell's host. */
  readonly isDevelopment: boolean
  /** Canon's `store.lists`, restricted to Kro-owned projects. */
  readonly projects: readonly Project[]
  /** Canon's `isAddingNewProject` — the inline "New project…" row. */
  readonly isAddingProject: boolean
  /** What has been typed into that row so far. */
  readonly draftProjectTitle: string
  /** Canon's `searchText`, for the sidebar's own search field. */
  readonly searchQuery: string
  /** Canon's `splitVisibility` — whether the sidebar column is showing. */
  readonly isSidebarVisible: boolean
  /** The one-shot a capture handed the shell, or `null`. */
  readonly routeContext: ShellRouteContext | null
}

export const initialMainState: MainState = {
  load: { kind: 'idle' },
  surface: SSR_DEFAULT_SURFACE,
  // Canon's `isInitial` element. Present before any flag resolves so the first
  // paint has a selection; the gates decide whether its ROW is rendered, never
  // what is selected.
  selected: { kind: DestinationKind.myDay },
  gates: closedDestinationGates,
  isDevelopment: false,
  projects: [],
  isAddingProject: false,
  draftProjectTitle: '',
  searchQuery: '',
  isSidebarVisible: true,
  routeContext: null,
}

export const mainSlice = createSlice({
  name: 'main',
  initialState: initialMainState,
  reducers: {
    /**
     * Lifecycle: the shell mounted and has measured the browser once.
     *
     * `isDevelopment` arrives from the composition root because a
     * platform-free tier has no build configuration to read — the same call
     * `FeatureFlagBaseline` already makes for `developmentActions`.
     */
    onShellMounted(
      state,
      action: PayloadAction<{
        surface: DoSurface
        isDevelopment: boolean
      }>,
    ) {
      Object.assign(
        state,
        withSurfaceChanged(state, action.payload.surface),
      )
      state.isDevelopment = action.payload.isDevelopment
    },

    /**
     * Lifecycle: the viewport or the pointer changed class.
     *
     * The only field it touches is `surface` — which is the whole of
     * acceptance criterion 2: crossing the breakpoint cannot disturb
     * `selected`, because this arm cannot reach it.
     */
    onSurfaceChanged(state, action: PayloadAction<{ surface: DoSurface }>) {
      Object.assign(state, withSurfaceChanged(state, action.payload.surface))
    },

    /**
     * Lifecycle: a destination route mounted and named itself.
     *
     * The URL is the authority on load, on a back/forward step and on a
     * pasted link; this is how it reaches the slice without any component
     * importing a router (`RC-17`, `RC-63`).
     */
    onDestinationRouteMounted(
      state,
      action: PayloadAction<{ destination: SidebarDestination }>,
    ) {
      Object.assign(
        state,
        withDestinationSelected(state, action.payload.destination),
      )
    },

    /** User intent: a sidebar row or a tab. Canon's
     * `userIsSelectingNavigationElement`. The navigation itself is a Producer's
     * (`RC-17`); this arm only records the choice so the highlight is
     * immediate. */
    userDidTapDestination(
      state,
      action: PayloadAction<{ destination: SidebarDestination }>,
    ) {
      Object.assign(
        state,
        withDestinationSelected(state, action.payload.destination),
      )
    },

    /** User intent: the sidebar toggle. Canon's
     * `userDidUpdateSplitViewVisibility`. One primitive field, so no Shifter
     * (`RC-4`). */
    userDidToggleSidebar(state) {
      state.isSidebarVisible = !state.isSidebarVisible
    },

    /** User intent: typing in the sidebar's search field. */
    userDidChangeSearchQuery(
      state,
      action: PayloadAction<{ query: string }>,
    ) {
      Object.assign(
        state,
        withSearchQueryChanged(state, action.payload.query),
      )
    },

    /** User intent: the "+" in the sidebar's Lists section. */
    userDidTapAddProject(state) {
      Object.assign(state, withDraftProjectStarted(state))
    },

    /** User intent: typing into the inline "New project…" row. */
    userDidEditDraftProjectTitle(
      state,
      action: PayloadAction<{ title: string }>,
    ) {
      Object.assign(
        state,
        withDraftProjectTitleEdited(state, action.payload.title),
      )
    },

    /** User intent: escaping out of the inline row. */
    userDidCancelAddProject(state) {
      Object.assign(state, withDraftProjectCancelled(state))
    },

    /** Lifecycle: the destination read the shell's one-shot, so it is spent. */
    onShellRouteContextConsumed(state) {
      state.routeContext = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadShellThunk.pending, (state) => {
        Object.assign(state, withLoadingStarted(state))
      })
      .addCase(loadShellThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withShellLoaded(state, result.value))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(loadShellThunk.rejected, (state, action) => {
        // Cancellation is the only silent exit (`UZF-14`).
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            MainExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      .addCase(createProjectThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withProjectsInstalled(state, result.value))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(createProjectThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            MainExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      .addCase(deleteProjectThunk.fulfilled, (state, action) => {
        const result = action.payload
        if (result.ok) {
          Object.assign(state, withProjectDeleted(state, result.value))
        } else {
          Object.assign(state, withException(state, result.error))
        }
      })
      .addCase(deleteProjectThunk.rejected, (state, action) => {
        if (action.meta.aborted) return
        Object.assign(
          state,
          withException(
            state,
            MainExceptions.unknown(action.error.message ?? 'Unknown error'),
          ),
        )
      })

      .addCase(deliverCaptureRouteThunk.fulfilled, (state, action) => {
        const result = action.payload
        // `null` means "nothing was due" — the common case on every tick.
        if (result.ok && result.value !== null) {
          Object.assign(state, withCaptureRouteConsumed(state, result.value))
        }
      })
  },
})

export const {
  onDestinationRouteMounted,
  onShellMounted,
  onShellRouteContextConsumed,
  onSurfaceChanged,
  userDidCancelAddProject,
  userDidChangeSearchQuery,
  userDidEditDraftProjectTitle,
  userDidTapAddProject,
  userDidTapDestination,
  userDidToggleSidebar,
} = mainSlice.actions
