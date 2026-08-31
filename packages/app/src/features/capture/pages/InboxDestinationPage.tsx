'use client'

/**
 * The `/inbox` destination — the sidebar's "Jot Down" row, as a full page
 * (`RC-37`).
 *
 * Canon's macOS sidebar routes `.inbox` to a destination rather than to a
 * popover; the popover is the *toolbar* affordance. The web keeps both, and
 * this is the destination half: the same `InboxFragment`, presented inline in
 * the shell's content area with no dialog and no dismiss control, because a
 * page is navigated away from rather than dismissed.
 *
 * ## Why it yields to the overlay
 *
 * The shell turns a capture's inbox route into a navigation to this path
 * (`selectPendingShellRoute` -> `deliverCaptureRouteThunk`), while the capture
 * slice independently opens `inbox.isOpen`. Rendering both would put the same
 * surface on screen twice, so the page stands down while the overlay is up —
 * the overlay is the presentation canon uses for a capture that has just
 * landed, and it carries the Just Created row. Dismissing it (Done, Escape,
 * the overlay) clears `isOpen` and this page takes over, which is exactly right
 * because the user is standing on Jot Down by then.
 *
 * The route mount is re-dispatched here rather than inherited from
 * `DestinationPage`: that shared Page renders the placeholder, and a feature
 * child replaces a destination's body by owning its route's Page. The
 * selection dispatch is the part that must survive the swap — it is what makes
 * a pasted link, a back step and a forward step all arrive as a fresh mount and
 * move the sidebar's highlight (`RC-17`, `RC-63`).
 */

import { useEffect } from 'react'
import { useAppDispatch } from '../../../library/hooks'
import { onDestinationRouteMounted } from '../../main/MainFeature'
import { DestinationKind } from '../../main/SidebarDestination'
import { loadCaptureContextThunk } from '../CaptureProducer'
import { InboxFragment } from './InboxFragment'
import { useInboxSurface } from './useInboxSurface'

export function InboxDestinationPage() {
  const dispatch = useAppDispatch()
  const inbox = useInboxSurface()

  useEffect(() => {
    dispatch(
      onDestinationRouteMounted({
        destination: { kind: DestinationKind.inbox },
      }),
    )
    const effect = dispatch(loadCaptureContextThunk({ now: new Date() }))
    return () => effect.abort()
  }, [dispatch])

  if (inbox.isOpen) return null

  return <InboxFragment {...inbox} isOpen presentation="inline" />
}
