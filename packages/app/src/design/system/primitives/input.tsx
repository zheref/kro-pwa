import type { ComponentPropsWithoutRef } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_FIELD,
} from '../density'
import { cn } from '../utils/cn'

/**
 * Input — the field surface, ported from KroApple's `kroFieldSurface(_:)`.
 *
 * Recessed one step from the card it sits in (`back-inner`), rounded to the
 * field radius. Compact is the default height; comfortable is the mobile
 * preview. The 44px floor is opt-in via className, not a silent default.
 *
 * The hairline border is not decoration: a fill-only field disappears against
 * a dark card, which is the exact reason the Swift modifier draws one in both
 * schemes rather than relying on the fill.
 *
 * The disabled fade appears once, here — see the note on `Button`.
 */
export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  readonly density?: ControlDensity
}

export function Input({
  className,
  type,
  density = DEFAULT_CONTROL_DENSITY,
  ...rest
}: InputProps) {
  return (
    <input
      data-slot="input"
      data-density={density}
      type={type}
      className={cn(
        'flex w-full min-w-0 rounded-kro-field px-kro-small',
        DENSITY_FIELD[density],
        'bg-kro-back-inner text-kro-fore',
        'border border-kro-hairline',
        'placeholder:text-kro-fore-secondary',
        'kro-motion-quick transition-[border-color,box-shadow]',
        'outline-none focus-visible:border-kro-accent focus-visible:shadow-[var(--kro-ring)]',
        'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
        'aria-invalid:border-kro-banner-danger',
        'file:inline-flex file:border-0 file:bg-transparent file:text-xs file:font-medium',
        className,
      )}
      {...rest}
    />
  )
}
