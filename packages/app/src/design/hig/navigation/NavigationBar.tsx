import type { ReactNode } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_HIT,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * NavigationBar — HIG "Navigation bars", painted with KroGlass.
 *
 * A glass title bar that names the current screen and hosts leading and
 * trailing actions. The bar never routes: a back chevron is a node the
 * caller passes in, and the Producer behind that node is what navigates
 * (`RC-17`). Colour is not a destination — the title is the location.
 *
 * `position` is forced `relative` inline. `.kro-glass` is already relative
 * (Safari + backdrop-filter); a `fixed` bar here would fight that rule and
 * bleed the filter into collapsing browser chrome.
 */

export interface NavigationBarProps {
  readonly title: string
  readonly leading?: ReactNode
  readonly trailing?: ReactNode
  readonly large?: boolean
  readonly className?: string
  readonly density?: ControlDensity
}

export function NavigationBar({
  title,
  leading,
  trailing,
  large = false,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: NavigationBarProps) {
  return (
    <header
      data-slot="navigation-bar"
      data-density={density}
      className={cn('kro-glass kro-glass--bar flex flex-col', className)}
      style={{ position: 'relative' }}
    >
      <div
        className={cn(
          'flex items-center gap-kro-tiny px-kro-small',
          DENSITY_ROW[density],
        )}
      >
        <div
          className={cn(
            'flex items-center justify-start',
            DENSITY_HIT[density],
          )}
        >
          {leading}
        </div>
        <p
          className={cn(
            'min-w-0 flex-1 truncate text-center font-semibold text-kro-fore',
            large && 'sr-only',
          )}
        >
          {title}
        </p>
        <div
          className={cn('flex items-center justify-end', DENSITY_HIT[density])}
        >
          {trailing}
        </div>
      </div>
      {large ? (
        <h1 className="px-kro-medium pb-kro-small text-2xl font-bold text-kro-fore">
          {title}
        </h1>
      ) : null}
    </header>
  )
}
