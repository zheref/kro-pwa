import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../utils/cn'

/**
 * Input — the field surface, ported from KroApple's `kroFieldSurface(_:)`.
 *
 * Recessed one step from the card it sits in (`back-inner`), rounded to the
 * field radius, and never below the 44px minimum height so a one-line input is
 * still a comfortable target.
 *
 * The hairline border is not decoration: a fill-only field disappears against
 * a dark card, which is the exact reason the Swift modifier draws one in both
 * schemes rather than relying on the fill.
 *
 * The disabled fade appears once, here — see the note on `Button`.
 */
export type InputProps = ComponentPropsWithoutRef<'input'>

export function Input({ className, type, ...rest }: InputProps) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'flex h-11 w-full min-w-0 rounded-kro-field px-kro-small py-kro-small',
        'bg-kro-back-inner text-kro-fore text-base',
        'border border-kro-hairline',
        'placeholder:text-kro-fore-secondary',
        'kro-motion-quick transition-[border-color,box-shadow]',
        'outline-none focus-visible:border-kro-accent focus-visible:shadow-[var(--kro-ring)]',
        'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
        'aria-invalid:border-kro-banner-danger',
        'file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...rest}
    />
  )
}
