import { ChevronRight } from 'lucide-react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * PathControl — HIG "Path controls", a breadcrumb.
 *
 * Ancestors are buttons so a person can jump back through a hierarchy.
 * The last item is the current page: it is not a button, and it carries
 * `aria-current="page"`. The separator is a chevron in the secondary
 * foreground — a glyph, not colour, is what separates the crumbs.
 *
 * Selecting an ancestor reports an id. This control never navigates
 * (`RC-17`).
 */

export interface PathControlItem {
  readonly id: string
  readonly label: string
}

export interface PathControlProps {
  readonly items: readonly PathControlItem[]
  readonly onSelect?: (id: string) => void
  readonly className?: string
  readonly density?: ControlDensity
}

export function PathControl({
  items,
  onSelect,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: PathControlProps) {
  return (
    <nav
      data-slot="path-control"
      data-density={density}
      aria-label="Path"
      className={cn('flex flex-wrap items-center gap-kro-tiny', className)}
    >
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1
        return (
          <span key={item.id} className="inline-flex items-center gap-kro-tiny">
            {index === 0 ? null : (
              <ChevronRight
                aria-hidden="true"
                className="size-4 text-kro-fore-secondary"
              />
            )}
            {isCurrent ? (
              <span aria-current="page" className="font-semibold text-kro-fore">
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                className={cn(
                  'rounded-kro-small px-kro-tiny text-kro-fore-secondary',
                  DENSITY_ROW[density],
                  'outline-none hover:text-kro-fore',
                  'focus-visible:shadow-[var(--kro-ring)]',
                )}
                onClick={() => onSelect?.(item.id)}
              >
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
