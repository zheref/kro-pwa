import { type ComponentPropsWithoutRef, useId } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * TextView — HIG "Text views", painted with KroTokens.
 *
 * The same recessed field recipe as `Input`, grown to a multiline surface.
 * A fill-only field vanishes on a dark card, so the hairline is not
 * decoration. The disabled fade is applied EXACTLY ONCE, here — a wrapper
 * that also dims its subtree would multiply the two and drop the control
 * below the 3:1 floor.
 */

export interface TextViewProps extends ComponentPropsWithoutRef<'textarea'> {
  readonly label?: string
  readonly density?: ControlDensity
}

export function TextView({
  label,
  id,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  ...rest
}: TextViewProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId

  const field = (
    <textarea
      id={controlId}
      data-slot="text-view"
      data-density={density}
      className={cn(
        'w-full min-w-0 rounded-kro-field px-kro-small py-kro-small',
        'min-h-[88px] bg-kro-back-inner text-kro-fore',
        density === 'compact' ? 'text-xs' : 'text-sm',
        'border border-kro-hairline',
        'placeholder:text-kro-fore-secondary',
        'kro-motion-quick transition-[border-color,box-shadow]',
        'outline-none focus-visible:border-kro-accent focus-visible:shadow-[var(--kro-ring)]',
        'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
        'aria-invalid:border-kro-banner-danger',
        className,
      )}
      {...rest}
    />
  )

  if (label === undefined) return field

  return (
    <label
      className="flex flex-col gap-kro-tiny text-kro-fore"
      htmlFor={controlId}
    >
      <span className="text-sm font-medium">{label}</span>
      {field}
    </label>
  )
}
