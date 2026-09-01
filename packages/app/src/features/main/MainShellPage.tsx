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
 *
 * ## The Active Toast host, and why it is mounted HERE (KC-IS-#71 item 15)
 *
 * `ActiveToastHost` is a Component (`RC-14`): it keeps the toast in React state
 * behind a context and may not learn that a store exists. `useActiveToasts()`
 * throws outside a host, so the host must be an ANCESTOR of everything that
 * enqueues — every destination, and every overlay in `AppShellClient`'s anchor.
 * Both arrive here as `children`, so this is the highest point that is still
 * inside the store's Provider.
 *
 * Two hosts used to be mounted further down — one in `CaptureOverlays`, one in
 * `DoSurfaceFragment` — each `position="absolute"` inside its own subtree. That
 * had three consequences the built app showed: a toast raised on the Do surface
 * and one raised from the Inbox were different toasts (so neither replaced the
 * other, which is the one-deep contract), neither was anchored to the viewport,
 * and **the lift-above-pill rule was unreachable** because no host was told
 * whether the Session Pill was on screen. One host, at the shell, fixes all
 * three: it is `position="fixed"`, it is handed the shell's own bottom inset,
 * and it reads the pill's visibility from the session slice.
 *
 * Reading `session` and `main` together is a root-level composition of two
 * Selectors, which is exactly what `RC-20` sanctions and what this Page already
 * does for the capture slice below.
 */
import { useCallback, useEffect, type ReactNode } from 'react'
import { ActiveToastHost } from '../../design/chrome/toast/ActiveToastHost'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import { selectIsSessionPillVisible } from '../session/SessionSelectors'
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
import { onCaptureRouteDelivered } from '../capture/CaptureFeature'
import { ProfileControlPage } from '../settings/pages/ProfileControlPage'
import { searchDestination } from './NavigationSections'
import { DestinationKind, type SidebarDestination } from './SidebarDestination'
import { shellBottomInset } from './DoSurfaceLayout'
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

export function MainShellPage({ isDevelopment, children }: MainShellPageProps) {
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
  const isSessionPillVisible = useAppSelector(selectIsSessionPillVisible)

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
      ).then((action) => {
        // The intent lives in the capture slice; consuming it there is what
        // stops a shell remount (Strict Mode, leaving and re-entering) from
        // replaying the same navigation. The Page is the one artifact allowed
        // to dispatch across slices (RC-37/RC-20).
        const result = deliverCaptureRouteThunk.fulfilled.match(action)
          ? action.payload
          : null
        if (result?.ok && result.value !== null) {
          dispatch(onCaptureRouteDelivered({ now: new Date() }))
        }
      })
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
      const wasSelected =
        selected.kind === 'list' && selected.listId === projectId
      void dispatch(
        deleteProjectThunk({ id: projectId, now: new Date() }),
      ).then(() => {
        // The shifter already moves `selected` to My Day; the URL must
        // follow, or the route remount re-selects the deleted list and the
        // highlight snaps back.
        if (wasSelected) {
          void dispatch(
            navigateToDestinationThunk({
              destination: { kind: DestinationKind.myDay },
            }),
          )
        }
      })
    },
    [dispatch, selected],
  )

  return (
    <ActiveToastHost
      isSessionPillVisible={isSessionPillVisible}
      /*
        The shell's own bottom chrome, handed over rather than read from
        `--kro-shell-bottom-inset`. The host renders the layer as a SIBLING of
        the shell's root element, and a custom property inherits downward only
        — so the variable `MainShellFragment` publishes on that root would not
        reach the layer. The prop is the seam the kit already declares for
        exactly this case.
      */
      bottomInset={shellBottomInset(shape, layout)}
    >
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
          onTapInbox={() =>
            onSelectDestination({ kind: DestinationKind.inbox })
          }
          onTapSettings={() =>
            onSelectDestination({ kind: DestinationKind.settings })
          }
        >
          {/*
            The Profile control's CONTENT, mounted shell-wide (KC-IS-#32).

            It fills the shell's `profile` toolbar slot with canon's
            `ProfilePopoverView`, and it hosts the two surfaces that must be
            reachable from anywhere rather than from one destination: the auth
            sheet, and the existing-local-data dialog — which appears after a
            sign-in that may have completed via an OAuth redirect landing on any
            route at all.

            Mounted here rather than inside `/adjust` for exactly that reason, and
            composed by the shell's Page rather than imported by its Fragment: a
            Page is the artifact allowed to reach across features (`RC-37`), the
            same way this one already dispatches into the capture slice above.
          */}
          <ProfileControlPage />
          {children}
        </MainShellFragment>
      </ToolbarSlotsProvider>
    </ActiveToastHost>
  )
}
