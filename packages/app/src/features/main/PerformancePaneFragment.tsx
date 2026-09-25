/**
 * The trailing detail pane's Performance segment, drawn — canon #517's
 * `macPerformancePaneContent`.
 *
 * Passive (`RC-15`): it portals whichever reading its Page picked into the
 * pane body and says which one it is. It never reads the store.
 */
import type { ReactNode } from 'react'
import { ToolbarSlot } from './ToolbarSlots'

/** The two readings the Performance segment can show. */
export type PerformancePaneReading = 'dayProgress' | 'endeavorActivity'

export interface PerformancePaneFragmentProps {
  /** `null` while the pane is on another segment: nothing is drawn. */
  readonly reading: PerformancePaneReading | null
  /** The reading's own content. */
  readonly children: ReactNode
}

export function PerformancePaneFragment({
  reading,
  children,
}: PerformancePaneFragmentProps) {
  if (reading === null) return null
  return (
    <ToolbarSlot placement="detailPane">
      <div
        data-testid="detail-pane-performance"
        data-reading={reading}
        className="flex flex-col pb-kro-medium"
      >
        {children}
      </div>
    </ToolbarSlot>
  )
}
