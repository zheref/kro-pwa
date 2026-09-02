import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../utils/cn'

export interface DetailBackdropProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /**
   * Pin to the viewport rather than to the nearest positioned ancestor.
   *
   * The shell wants this: the field stays put while destination content
   * scrolls, which is what gives floating glass something moving to sample.
   */
  readonly fixed?: boolean
}

/**
 * The page's own indigo→grape field — canon `DetailBackdrop`.
 *
 * Decorative by construction: `aria-hidden` and `pointer-events: none`.
 * Destinations sit *on* it, never *in* it. The header slab (`GradientBackdrop`)
 * remains for stories and surfaces that still want a top inset rather than a
 * full-window field.
 */
export function DetailBackdrop({
  fixed = false,
  className,
  ...rest
}: DetailBackdropProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="detail-backdrop"
      className={cn(
        'kro-detail-backdrop',
        fixed && 'kro-detail-backdrop--fixed',
        className,
      )}
      {...rest}
    />
  )
}
