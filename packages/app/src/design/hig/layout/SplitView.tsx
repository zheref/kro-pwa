import type { ReactNode } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * SplitView — HIG "Split views", painted with KroTokens.
 *
 * Two panes side by side that share one task — typically a list and
 * its detail. The leading width is a CSS length; the trailing pane
 * takes the rest. Both panes clip and scroll (`min-h-0 min-w-0
 * overflow-auto`) so a tall list cannot blow the layout. The hairline
 * between them is the only divider.
 */

export interface SplitViewProps {
  readonly leading: ReactNode
  readonly trailing: ReactNode
  readonly leadingWidth?: string
  readonly className?: string
  readonly density?: ControlDensity
}

export function SplitView({
  leading,
  trailing,
  leadingWidth = '280px',
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: SplitViewProps) {
  return (
    <div
      data-slot="split-view"
      data-density={density}
      className={cn('grid min-h-0 min-w-0', DENSITY_TYPE[density], className)}
      style={{ gridTemplateColumns: `${leadingWidth} 1fr` }}
    >
      <div
        data-slot="split-view-leading"
        className="min-h-0 min-w-0 overflow-auto border-r border-kro-hairline"
      >
        {leading}
      </div>
      <div
        data-slot="split-view-trailing"
        className="min-h-0 min-w-0 overflow-auto"
      >
        {trailing}
      </div>
    </div>
  )
}
