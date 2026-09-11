import type { ReactNode } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Lockup — HIG "Lockups", painted with KroTokens.
 *
 * An image or icon, a title and optional subtitle as one unit. When
 * `onClick` is set the whole row is the target — never a nested
 * control inside a tappable row. The density floor holds even when the
 * subtitle wraps.
 */

export interface LockupProps {
  readonly title: string
  readonly subtitle?: string
  readonly leading: ReactNode
  readonly onClick?: () => void
  readonly className?: string
  readonly density?: ControlDensity
}

export function Lockup({
  title,
  subtitle,
  leading,
  onClick,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: LockupProps) {
  const classes = cn(
    'flex w-full items-center gap-kro-small text-left text-kro-fore',
    DENSITY_ROW[density],
    onClick !== undefined &&
      'outline-none focus-visible:shadow-[var(--kro-ring)]',
    className,
  )

  const body = (
    <>
      <span data-slot="lockup-leading" className="shrink-0" aria-hidden>
        {leading}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{title}</span>
        {subtitle === undefined ? null : (
          <span className="text-[13px] text-kro-fore-secondary">
            {subtitle}
          </span>
        )}
      </span>
    </>
  )

  if (onClick === undefined) {
    return (
      <div data-slot="lockup" data-density={density} className={classes}>
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      data-slot="lockup"
      data-density={density}
      className={classes}
      onClick={onClick}
    >
      {body}
    </button>
  )
}
