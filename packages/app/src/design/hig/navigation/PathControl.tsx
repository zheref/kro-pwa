import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * PathControl — the trail of the current place in a hierarchy.
 *
 * Ancestors are buttons so a person can jump back. The last item is
 * the current page: it is not a button, and it carries
 * `aria-current="page"`. The separator is a chevron — a glyph, not
 * colour. Selecting an ancestor reports an id; this control never
 * navigates (`RC-17`).
 *
 * When `maxItems` cannot fit the trail, the middle collapses into a
 * "…" button that expands the hidden crumbs. Fluent calls this
 * Breadcrumb; Primer calls it Breadcrumbs.
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
  /** Collapse the middle when the trail is longer than this. */
  readonly maxItems?: number
}

type VisiblePart =
  | {
      readonly kind: 'crumb'
      readonly item: PathControlItem
      readonly isCurrent: boolean
    }
  | { readonly kind: 'overflow' }

export function pathControlVisibleParts(
  items: readonly PathControlItem[],
  maxItems: number | undefined,
  expanded: boolean,
): readonly VisiblePart[] {
  const lastIndex = items.length - 1
  if (expanded || maxItems === undefined || items.length <= maxItems) {
    return items.map((item, index) => ({
      kind: 'crumb',
      item,
      isCurrent: index === lastIndex,
    }))
  }

  const last = items[lastIndex]
  if (last === undefined) return []

  if (maxItems <= 2) {
    return [
      { kind: 'overflow' },
      { kind: 'crumb', item: last, isCurrent: true },
    ]
  }

  const first = items[0]
  const trailingCount = maxItems - 2
  const trailing = items.slice(items.length - trailingCount)
  const parts: VisiblePart[] = []
  if (first !== undefined) {
    parts.push({
      kind: 'crumb',
      item: first,
      isCurrent: false,
    })
  }
  parts.push({ kind: 'overflow' })
  for (const [index, item] of trailing.entries()) {
    parts.push({
      kind: 'crumb',
      item,
      isCurrent: index === trailing.length - 1,
    })
  }
  return parts
}

export function PathControl({
  items,
  onSelect,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  maxItems,
}: PathControlProps) {
  const [expanded, setExpanded] = useState(false)
  const parts = pathControlVisibleParts(items, maxItems, expanded)

  return (
    <nav
      data-slot="path-control"
      data-density={density}
      aria-label="Path"
      className={cn('flex flex-wrap items-center gap-kro-tiny', className)}
    >
      {parts.map((part, index) => (
        <span
          key={
            part.kind === 'overflow' ? 'overflow' : `${part.item.id}-${index}`
          }
          className="inline-flex items-center gap-kro-tiny"
        >
          {index === 0 ? null : (
            <ChevronRight
              aria-hidden="true"
              className="size-4 text-kro-fore-secondary"
            />
          )}
          {part.kind === 'overflow' ? (
            <button
              type="button"
              aria-label="More"
              className={cn(
                'rounded-kro-small px-kro-tiny text-kro-fore-secondary',
                DENSITY_ROW[density],
                'outline-none hover:text-kro-fore',
                'focus-visible:shadow-[var(--kro-ring)]',
              )}
              onClick={() => setExpanded(true)}
            >
              …
            </button>
          ) : part.isCurrent ? (
            <span aria-current="page" className="font-semibold text-kro-fore">
              {part.item.label}
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
              onClick={() => onSelect?.(part.item.id)}
            >
              {part.item.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  )
}
