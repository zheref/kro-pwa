'use client'

/**
 * `/execute` — the Execute destination's body (`RC-37`).
 *
 * The shell wrote every route file once, and the swap point it left behind was
 * *"when a feature child lands, its Page replaces the placeholder call"*. This
 * is that replacement for the session destination, and it carries the two things
 * the placeholder was doing on the shell's behalf:
 *
 * 1. **The mount dispatch.** `onDestinationRouteMounted` is what makes the URL
 *    the authority — a pasted link, a back step and a forward step all arrive as
 *    a fresh mount, and the sidebar's highlight and heading follow without any
 *    component reading a router (`RC-17`, `RC-63`). Dropping it would leave the
 *    sidebar pointing at whatever destination was selected last.
 *
 *    That dispatch belongs to the `main` slice. A Page is the one artifact
 *    allowed to dispatch across slices (`RC-37`), and `MainShellPage` already
 *    does exactly this in the other direction with the capture slice's
 *    `onCaptureRouteDelivered`, for the same reason and with the same note.
 *
 * 2. **The blank focus session.** `docs/Features/Session.md` § Entry points:
 *    *"The 'Start Session' entry on the Do tab's quick-action menu raises a
 *    blank focus session"*. The web's Execute destination is that entry point —
 *    arriving with nothing selected must give the user something to start, not
 *    an empty frame. `prepareSessionLaunchThunk` with `endeavorId: null` is the
 *    supported way to raise one; editing its title or glyph later promotes it
 *    into a real endeavor.
 *
 *    It is raised **only** when the session is genuinely idle. A running,
 *    paused, concluded or break session is what the user came back to see, and
 *    `withLaunchPrepared` refuses anyway (`phase !== ready` returns the state
 *    untouched) — so the guard here is about not minting a pointless id, not
 *    about correctness.
 *
 * The id is the caller's to mint, never the Producer's — the same ruling
 * `CaptureProducer` and `MainShellPage`'s project creation both record.
 */
import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { onDestinationRouteMounted } from '../../main/MainFeature'
import { DestinationKind } from '../../main/SidebarDestination'
import { prepareSessionLaunchThunk } from '../SessionProducer'
import {
  selectIsSessionLoading,
  selectSessionIdentity,
  selectSessionPhase,
} from '../SessionSelectors'
import { SessionPhase } from '../SessionVocabulary'
import { SessionSheetPage } from './SessionSheetPage'

export function SessionDestinationPage() {
  const dispatch = useAppDispatch()
  const phase = useAppSelector(selectSessionPhase)
  const identity = useAppSelector(selectSessionIdentity)
  const isLoading = useAppSelector(selectIsSessionLoading)
  const hasRaisedBlankSession = useRef(false)

  useEffect(() => {
    dispatch(
      onDestinationRouteMounted({
        destination: { kind: DestinationKind.session },
      }),
    )
  }, [dispatch])

  useEffect(() => {
    // Wait for the boot read the shell's overlay owns: preparing before the
    // preferences land would recommend against the default flag set rather
    // than the user's, and the recommendation is not re-run afterwards.
    if (isLoading) return
    if (phase !== SessionPhase.ready) return
    if (identity !== null) return
    if (hasRaisedBlankSession.current) return
    hasRaisedBlankSession.current = true

    void dispatch(
      prepareSessionLaunchThunk({
        endeavorId: null,
        sessionId: crypto.randomUUID(),
      }),
    )
  }, [dispatch, identity, isLoading, phase])

  return (
    <div className="flex w-full justify-center px-kro-medium py-kro-large">
      <SessionSheetPage host="destination" />
    </div>
  )
}
