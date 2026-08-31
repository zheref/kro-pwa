'use client'

/**
 * The shell's stateful container (`RC-37`; implements `UZF-4`).
 *
 * The only artifact in this feature that calls both `useAppSelector` and
 * `useAppDispatch`. It selects, it dispatches, and it renders exactly one
 * Fragment — every layout decision it passes down came from a Selector over
 * the ported decision table, never from a media query read here.
 *
 * It wraps that Fragment in `ToolbarSlotsProvider`, which is plumbing rather
 * than markup: the provider holds the outlet elements a destination's
 * `ToolbarSlot` portals into, and it has to sit above both the shell's
 * toolbars and the destination that fills them.
 */
import { useCallback, useEffect, type ReactNode } from 'react'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import { MainShellFragment } from './MainShellFragment'
import {
  onShellMounted,
  onSurfaceChanged,
  userDidCancelAddProject,
  userDidChangeSearchQuery,
  userDidEditDraftProjectTitle,
  userDidTapAddProject,
  userDidTapDestination,
  userDidToggleSidebar,
} from './MainFeature'
import {
  createProjectThunk,
  deleteProjectThunk,
  deliverCaptureRouteThunk,
  loadShellThunk,
  navigateToDestinationThunk,
} from './MainProducer'
import {
  selectCanManageProjects,
  selectDraftProjectTitle,
  selectIsAddingProject,
  selectIsSidebarVisible,
  selectLayout,
  selectPendingShellRoute,
  selectSearchQuery,
  selectSelectedDestination,
  selectShellShape,
  selectSidebarSections,
  selectTabBarElements,
} from './MainSelectors'
import { searchDestination } from './NavigationSections'
import {
  DestinationKind,
  type SidebarDestination,
} from './SidebarDestination'
import { ToolbarSlotsProvider } from './ToolbarSlots'
import { useSurfaceLayout } from './useSurfaceLayout'

export interface MainShellPageProps {
  /**
   * Canon's `#if DEBUG` for the Tweak row, and the `lists` flag's development
   * twin. Supplied by the composition root because a platform-free tier has no
   * build configuration to read.
   */
  readonly isDevelopment: boolean
  /** The destination route this shell is currently wrapping. */
  readonly children?: ReactNode
}

export function MainShellPage({
  isDevelopment,
  children,
}: MainShellPageProps) {
  const dispatch = useAppDispatch()
  const surface = useSurfaceLayout()

  const shape = useAppSelector(selectShellShape)
  const layout = useAppSelector(selectLayout)
  const selected = useAppSelector(selectSelectedDestination)
  const sections = useAppSelector(selectSidebarSections)
  const tabs = useAppSelector(selectTabBarElements)
  const searchQuery = useAppSelector(selectSearchQuery)
  const isAddingProject = useAppSelector(selectIsAddingProject)
  const draftProjectTitle = useAppSelector(selectDraftProjectTitle)
  const isSidebarVisible = useAppSelector(selectIsSidebarVisible)
  const canManageProjects = useAppSelector(selectCanManageProjects)
  const pendingRoute = useAppSelector(selectPendingShellRoute)

  // Mount: stamp the first measurement and resolve the gates + the Lists rows.
  useEffect(() => {
    dispatch(onShellMounted({ surface, isDevelopment }))
    const effect = dispatch(loadShellThunk())
    return () => effect.abort()
    // The surface is stamped once at mount; every later change arrives through
    // the effect below, which is what keeps this from re-running the load.
    // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by
    // design — `surface` is re-applied by the effect below, not by re-mounting.
  }, [dispatch, isDevelopment])

  // Every later crossing of the breakpoint (or a pointer change).
  useEffect(() => {
    dispatch(onSurfaceChanged({ surface }))
  }, [dispatch, surface])

  /**
   * The capture slice's routing one-shot.
   *
   * Canon sleeps `deliverAfterMs` inside its effect; there is no timer Service
   * in `ThunkExtra` to inject, so the wait is a `setTimeout` here — a view
   * concern (the same category as a debounce), with the *decision* still in
   * the slice and the *navigation* still in a Producer (`RC-17`). A newer
   * intent, or an unmount, clears the pending wait rather than letting a stale
   * one navigate.
   */
  useEffect(() => {
    if (pendingRoute === null) return

    const wait = Math.max(0, pendingRoute.deliverAtMs - Date.now())
    const timer = setTimeout(() => {
      void dispatch(
        deliverCaptureRouteThunk({ pending: pendingRoute, now: new Date() }),
      )
    }, wait)

    return () => clearTimeout(timer)
  }, [dispatch, pendingRoute])

  const onSelectDestination = useCallback(
    (destination: SidebarDestination) => {
      dispatch(userDidTapDestination({ destination }))
      void dispatch(navigateToDestinationThunk({ destination }))
    },
    [dispatch],
  )

  const onSubmitSearch = useCallback(() => {
    const destination: SidebarDestination = {
      kind: DestinationKind.search,
    }
    dispatch(userDidTapDestination({ destination }))
    void dispatch(navigateToDestinationThunk({ destination }))
  }, [dispatch])

  const onCommitDraftProject = useCallback(() => {
    void dispatch(
      createProjectThunk({
        // Identity is the composition root's to supply, never the Producer's
        // — the rule `CaptureProducer` states for the same reason.
        id: crypto.randomUUID(),
        title: draftProjectTitle,
        now: new Date(),
      }),
    )
  }, [dispatch, draftProjectTitle])

  const onDeleteProject = useCallback(
    (projectId: string) => {
      void dispatch(deleteProjectThunk({ id: projectId, now: new Date() }))
    },
    [dispatch],
  )

  return (
    <ToolbarSlotsProvider>
      <MainShellFragment
        shape={shape}
        layout={layout}
        selected={selected}
        sections={sections}
        tabs={tabs}
        searchDestination={searchDestination}
        searchQuery={searchQuery}
        isAddingProject={isAddingProject}
        draftProjectTitle={draftProjectTitle}
        canManageProjects={canManageProjects}
        isSidebarVisible={isSidebarVisible}
        onSelectDestination={onSelectDestination}
        onChangeSearchQuery={(query) =>
          dispatch(userDidChangeSearchQuery({ query }))
        }
        onSubmitSearch={onSubmitSearch}
        onTapAddProject={() => dispatch(userDidTapAddProject())}
        onEditDraftProjectTitle={(title) =>
          dispatch(userDidEditDraftProjectTitle({ title }))
        }
        onCommitDraftProject={onCommitDraftProject}
        onCancelDraftProject={() => dispatch(userDidCancelAddProject())}
        onDeleteProject={onDeleteProject}
        onToggleSidebar={() => dispatch(userDidToggleSidebar())}
        /*
          Profile opens Adjust for now. Canon's `ProfilePopoverView` is a
          popover whose primary action is `userDidTapOpenSettings(.profile)`
          — the popover itself belongs to the settings child (KC-IS-#32), so
          the shell routes straight to the destination that action targets
          rather than shipping a control that does nothing.
        */
        onTapProfile={() =>
          onSelectDestination({ kind: DestinationKind.settings })
        }
        onTapInbox={() => onSelectDestination({ kind: DestinationKind.inbox })}
        onTapSettings={() =>
          onSelectDestination({ kind: DestinationKind.settings })
        }
      >
        {children}
      </MainShellFragment>
    </ToolbarSlotsProvider>
  )
}
