/**
 * The trailing detail pane's Inbox segment, drawn — web-only (canon's
 * `DetailPaneSegment` has no Inbox case; see `DetailPane`).
 *
 * Passive (`RC-15`): it portals the Inbox its Page composed into the pane
 * body, or nothing while the pane is on another segment. It never reads the
 * store.
 */
import type { ReactNode } from 'react'
import { ToolbarSlot } from './ToolbarSlots'

export interface InboxPaneFragmentProps {
  /** `false` while the pane is on another segment: nothing is drawn. */
  readonly isShown: boolean
  /** The Inbox itself. */
  readonly children: ReactNode
}

export function InboxPaneFragment({
  isShown,
  children,
}: InboxPaneFragmentProps) {
  if (!isShown) return null
  return (
    <ToolbarSlot placement="detailPane">
      <div data-testid="detail-pane-inbox" className="flex min-h-full flex-col">
        {children}
      </div>
    </ToolbarSlot>
  )
}
