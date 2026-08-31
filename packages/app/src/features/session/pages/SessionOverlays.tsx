'use client'

/**
 * The session's shell-level mount — the pill, the raised surface, and the three
 * lifecycles a session owns for as long as the app is open.
 *
 * ## What it is, in UZF terms
 *
 * A **self-mounted, parent-less container** — the one narrow case `RC-37` names
 * ("a global toast host with no owning Page … it acts as its own container in
 * that case and imports the typed hooks"). There is no Page above it to dispatch
 * on its behalf, because there is no route that owns it: the pill has to survive
 * every navigation, and a countdown reaching zero has to re-present the sheet
 * wherever the user happens to be. So `apps/web`'s shell mounts this once, and
 * everything below is either a Selector read or a dispatch.
 *
 * ## The four things it owns
 *
 * 1. **Boot hydration** — `docs/Features/Session.md` flow 5, *"Resume across an
 *    app kill"*. Preferences first (the launch recommendation reads the gates
 *    they resolve), then the anchor, stamped with `now` so the pill's very first
 *    frame is wall-clock correct rather than the number the tab held when it was
 *    closed.
 * 2. **The display tick** — `startSessionTickTask`, running only while time is
 *    actually accruing. Canon: *"Paused and concluded phases intentionally have
 *    no sheet ticker — the time displays are static by design"*.
 * 3. **The document title** — `MM:SS — Kro` while a session runs, released
 *    otherwise. The web's stand-in for KroApple's macOS menu-bar extra, named as
 *    such by the epic. The label is a Selector's output, so the formatting is
 *    unit-tested without a DOM and this only crosses the boundary.
 * 4. **The wake lock, after a reload.** Every *transition* into an active phase
 *    already asks for the screen (`startSessionThunk`, `resumeSessionThunk`,
 *    `startBreakThunk`), but **hydration is not a transition** — a reload into a
 *    running session would come back with the screen released. One effect keyed
 *    on "is time accruing" closes that gap, and is idempotent everywhere else:
 *    `setScreenAwakeThunk` is a setter, and it re-reads
 *    `session.keepScreenAwake` at the effect site, so a user who turned the
 *    preference off still gets nothing.
 *
 * ## Where "the sheet is up" lives, and why it is component state
 *
 * The slice models exactly one presentation fact — `isPresentingConclusion`,
 * the auto-open a concluded countdown owes (flow 6). It has no event for *"the
 * user tapped the pill"*, because `#21` is the logic tier and that tap is
 * presentation. Canon keeps the whole thing as an optional child state on
 * `MainFeature` (`store.sessionSetup`), which the web's `main` slice has no
 * counterpart for either.
 *
 * So the reopened-from-pill flag is `useState` here, and it is honest about
 * being presentation: it is cleared the moment the session leaves the phase that
 * made it meaningful, and it never decides anything the slice decides. A
 * `session/userDidTapPill` event plus an `isPresentingSheet` field would be the
 * canon-faithful home; that is `#21`'s lane and is reported as a cross-lane
 * need rather than reached into from here.
 *
 * ## Why `/execute` silences both surfaces
 *
 * On that route the session sheet is already on screen as the destination's own
 * column, so raising a second copy over it would duplicate every control — and
 * canon hides the pill whenever the full surface is presented
 * (`isSessionPillVisible = runningSession != nil && sessionSetup == nil`). One
 * root-level Selector read answers both: `selectSelectedDestination`. That is a
 * cross-*slice* read from a container, which `RC-37` sanctions and `RC-20` does
 * not forbid — the rule is about a slice importing another slice's shape.
 */
import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { DestinationKind } from '../../main/SidebarDestination'
import { selectSelectedDestination } from '../../main/MainSelectors'
import { setScreenAwakeThunk } from '../../platform/PlatformProducer'
import { userDidDismissConclusion } from '../SessionFeature'
import {
  hydrateRunningSessionThunk,
  loadSessionPreferencesThunk,
  markEndeavorCompleteFromSessionThunk,
  pauseSessionThunk,
  resumeSessionThunk,
  startSessionTickTask,
  syncSessionDocumentTitleThunk,
} from '../SessionProducer'
import {
  selectIsPresentingConclusion,
  selectIsSessionActive,
  selectSessionDocumentTitle,
  selectSessionPhase,
  selectSessionPillState,
} from '../SessionSelectors'
import { SessionPhase } from '../SessionVocabulary'
import { SessionPillFragment } from './SessionPillFragment'
import { SessionSheetPage } from './SessionSheetPage'

export function SessionOverlays() {
  const dispatch = useAppDispatch()

  const phase = useAppSelector(selectSessionPhase)
  const pill = useAppSelector(selectSessionPillState)
  const isActive = useAppSelector(selectIsSessionActive)
  const isPresentingConclusion = useAppSelector(selectIsPresentingConclusion)
  const documentTitle = useAppSelector(selectSessionDocumentTitle)
  const selectedDestination = useAppSelector(selectSelectedDestination)

  const [isReopenedFromPill, setReopenedFromPill] = useState(false)
  const hasBooted = useRef(false)

  const isDestinationHostingSurface =
    selectedDestination.kind === DestinationKind.session

  // -- 1. Boot ------------------------------------------------------------
  useEffect(() => {
    // Strict Mode mounts twice in development; hydrating twice would mint a
    // second `now` and re-present a conclusion the user had already dismissed.
    if (hasBooted.current) return
    hasBooted.current = true

    let cancelled = false
    const preferences = dispatch(loadSessionPreferencesThunk())
    void preferences.then(() => {
      if (cancelled) return
      void dispatch(hydrateRunningSessionThunk({ now: new Date() }))
    })

    return () => {
      cancelled = true
      preferences.abort()
    }
  }, [dispatch])

  // -- 2. The display tick ------------------------------------------------
  useEffect(() => {
    if (!isActive) return
    const task = startSessionTickTask(dispatch)
    return () => task.abort()
  }, [dispatch, isActive])

  // -- 3. The document title ----------------------------------------------
  useEffect(() => {
    void dispatch(syncSessionDocumentTitleThunk({ title: documentTitle }))
  }, [dispatch, documentTitle])

  useEffect(
    () => () => {
      // Leaving the shell releases the tab's title rather than freezing a
      // stale countdown in it.
      void dispatch(syncSessionDocumentTitleThunk({ title: null }))
    },
    [dispatch],
  )

  // -- 4. The wake lock ---------------------------------------------------
  useEffect(() => {
    void dispatch(setScreenAwakeThunk({ enabled: isActive }))
  }, [dispatch, isActive])

  // The reopen flag is meaningless once the session is over.
  useEffect(() => {
    if (phase === SessionPhase.ready) setReopenedFromPill(false)
  }, [phase])

  const isSurfaceOpen =
    !isDestinationHostingSurface &&
    (isReopenedFromPill || isPresentingConclusion)

  return (
    <>
      <SessionPillFragment
        pill={pill}
        // Canon's conjunction, both halves: a session exists AND the full
        // surface is not presented — whether that surface is the raised one or
        // the `/execute` column.
        isVisible={
          pill.isVisible && !isSurfaceOpen && !isDestinationHostingSurface
        }
        onTapBody={() => setReopenedFromPill(true)}
        onTapPause={() => {
          void dispatch(pauseSessionThunk({ now: new Date() }))
        }}
        onTapResume={() => {
          void dispatch(resumeSessionThunk({ now: new Date() }))
        }}
        onTapComplete={() => {
          void dispatch(
            markEndeavorCompleteFromSessionThunk({ now: new Date() }),
          )
        }}
      />

      {/*
        Mounted only while it is up. Unlike the pill — which canon keeps in the
        layout so it can crossfade — the sheet is a portal with a focus trap and
        a scroll lock, and keeping one of those permanently mounted would hold
        both while nothing is on screen.
      */}
      {isSurfaceOpen ? (
        <SessionSheetPage
          host="raised"
          isOpen
          onRequestClose={() => {
            setReopenedFromPill(false)
            // Dismissing the auto-presented conclusion without picking is
            // flow 7: the pill stays, carrying Mark complete.
            if (isPresentingConclusion) dispatch(userDidDismissConclusion())
          }}
        />
      ) : null}
    </>
  )
}
