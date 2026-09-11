import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { GlassPanel } from '../../system/glass/GlassPanel'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_BOX,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Panel — HIG "Panels", an inspector pane.
 *
 * Not a modal. The optional close affordance is a labelled X that calls
 * `onClose` — the same visual as a dialog close, without the dialog
 * contract. The pane never navigates.
 */

export interface PanelProps {
  readonly title: string
  readonly children: ReactNode
  readonly onClose?: () => void
  readonly width?: number
  readonly className?: string
  readonly density?: ControlDensity
}

export function Panel({
  title,
  children,
  onClose,
  width = 320,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: PanelProps) {
  return (
    <GlassPanel
      kind="content"
      data-slot="panel"
      data-density={density}
      className={cn('rounded-kro-surface p-kro-medium', className)}
      style={{ width }}
    >
      <div
        className={cn(
          'mb-kro-small flex items-center gap-kro-small',
          DENSITY_ROW[density],
        )}
      >
        <h2 className="min-w-0 flex-1 font-semibold text-kro-fore text-lg">
          {title}
        </h2>
        {onClose === undefined ? null : (
          <button
            type="button"
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-kro-small',
              DENSITY_BOX[density],
              'text-kro-fore-secondary hover:text-kro-fore',
              'outline-none focus-visible:shadow-[var(--kro-ring)]',
            )}
            onClick={onClose}
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
      {children}
    </GlassPanel>
  )
}
