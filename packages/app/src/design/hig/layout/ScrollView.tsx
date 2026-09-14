import type { ComponentPropsWithoutRef } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * ScrollView — HIG "Scroll views", painted with KroTokens.
 *
 * A clipping region that scrolls its content. `role="region"` and
 * `tabIndex={0}` let a keyboard user focus the pane and scroll it
 * without a pointer. The axis is a prop, not a pair of competing
 * overflow utilities the caller has to remember.
 */

export type ScrollViewAxis = 'vertical' | 'horizontal' | 'both'

export interface ScrollViewProps extends ComponentPropsWithoutRef<'div'> {
  readonly axis?: ScrollViewAxis
  readonly density?: ControlDensity
}

const AXIS_CLASS: Record<ScrollViewAxis, string> = {
  vertical: 'overflow-y-auto overflow-x-hidden',
  horizontal: 'overflow-x-auto overflow-y-hidden',
  both: 'overflow-auto',
}

export function ScrollView({
  axis = 'vertical',
  density = DEFAULT_CONTROL_DENSITY,
  className,
  children,
  ...rest
}: ScrollViewProps) {
  return (
    <div
      data-slot="scroll-view"
      data-axis={axis}
      data-density={density}
      role="region"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be focusable so a keyboard user can scroll it
      tabIndex={0}
      className={cn(
        'min-h-0 min-w-0',
        AXIS_CLASS[axis],
        DENSITY_TYPE[density],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
