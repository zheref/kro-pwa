/**
 * The trailing detail pane's Plan segment with no endeavor, drawn — canon
 * #517's `macReadOnlyTimeline`.
 *
 * Passive (`RC-15`): it portals the timeline its Page hands it into the pane
 * body. It never reads the store and never dispatches.
 */
import type { ReactNode } from 'react'
import { ToolbarSlot } from './ToolbarSlots'

export interface TimelinePaneFragmentProps {
  /** `false` while the pane is elsewhere or pointed at an endeavor. */
  readonly isShown: boolean
  /** The read-only timeline. */
  readonly children: ReactNode
}

export function TimelinePaneFragment({
  isShown,
  children,
}: TimelinePaneFragmentProps) {
  if (!isShown) return null
  return (
    <ToolbarSlot placement="detailPane">
      <div
        data-testid="detail-pane-timeline"
        className="flex flex-col pb-kro-medium"
      >
        {children}
      </div>
    </ToolbarSlot>
  )
}
