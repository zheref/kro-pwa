'use client'

/**
 * The Inbox segment's stateful half (`RC-37`) — web-only; canon's pane has no
 * Inbox segment (`DetailPane` names the divergence).
 *
 * The pane hosts the **real** Inbox: the same `InboxFragment` and view model
 * the sheet, popover and Jot Down page use, with the `pane` presentation. Its
 * Triage layer is the same `TriageCarouselPage`, hosted with the `pane`
 * presentation, so starting Triage on a row opens the form over the list in
 * the pane, and confirming or backing out returns to the list.
 *
 * It composes the shell's pane and capture's Inbox, which only a Page may do
 * (`RC-20`, `RC-37`). The one thing it adds to the Inbox's own wiring is the
 * host on a row's Triage request, so the pane's layer opens it rather than
 * the overlay's. Mounted once by the shell's Page.
 */
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import { userDidTapTriage } from '../capture/CaptureFeature'
import { loadCaptureContextThunk } from '../capture/CaptureProducer'
import { InboxFragment } from '../capture/pages/InboxFragment'
import { useInboxSurface } from '../capture/pages/useInboxSurface'
import { selectIsTriageShownInPane } from '../triage/TriageSelectors'
import { TriageCarouselPage } from '../triage/pages/TriageCarouselPage'
import { InboxPaneFragment } from './InboxPaneFragment'
import { selectDetailPaneSegment } from './MainSelectors'

export interface InboxPanePageProps {
  readonly locale?: string
}

export function InboxPanePage({ locale }: InboxPanePageProps) {
  const segment = useAppSelector(selectDetailPaneSegment)
  const isShown = segment === 'inbox'
  return (
    <InboxPaneFragment isShown={isShown}>
      {/* Mounted only while shown: it reads the pool on mount. */}
      {isShown ? <InboxInPane locale={locale} /> : null}
    </InboxPaneFragment>
  )
}

function InboxInPane({ locale }: InboxPanePageProps) {
  const dispatch = useAppDispatch()
  const inbox = useInboxSurface()
  const isTriaging = useAppSelector(selectIsTriageShownInPane)

  // The pool is a per-surface read on this stack: reading it here is what
  // puts a capture that just routed into the pane on its Just Created row.
  useEffect(() => {
    const effect = dispatch(loadCaptureContextThunk({ now: new Date() }))
    return () => effect.abort()
  }, [dispatch])

  const onTapTriage = useCallback(
    (endeavorId: string) => {
      // `now` is read at the tap, as the Inbox's own handler does: canon
      // seeds Triage with the gap as the day stands right then.
      dispatch(userDidTapTriage({ endeavorId, now: new Date(), host: 'pane' }))
    },
    [dispatch],
  )

  return (
    <InboxFragment
      {...inbox}
      isOpen
      presentation="pane"
      isOverlayCovering={isTriaging}
      locale={locale}
      onTapTriage={onTapTriage}
      overlay={<TriageCarouselPage presentation="pane" locale={locale} />}
    />
  )
}
