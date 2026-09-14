import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_BOX,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * OutlineView — HIG "Outline views", painted with KroTokens.
 *
 * A hierarchical list whose rows expand in place. The expand control
 * is its own button; the row label is a second button. They are
 * siblings — never a button inside a button. Indent is
 * `level * --kro-space-medium` (16px), not a magic number.
 *
 * Expanded ids are controlled (`expanded`) or uncontrolled
 * (`defaultExpanded`). Both buttons are focusable so the keyboard
 * can walk the tree without a custom roving tabindex.
 */

export interface OutlineViewItem {
  readonly id: string
  readonly title: string
  readonly children?: readonly OutlineViewItem[]
}

export interface OutlineViewProps {
  readonly items: readonly OutlineViewItem[]
  readonly expanded?: readonly string[]
  readonly defaultExpanded?: readonly string[]
  readonly onExpandedChange?: (ids: readonly string[]) => void
  readonly onSelect?: (id: string) => void
  readonly className?: string
  readonly density?: ControlDensity
}

export function OutlineView({
  items,
  expanded,
  defaultExpanded = [],
  onExpandedChange,
  onSelect,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: OutlineViewProps) {
  const isControlled = expanded !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded)
  const openIds = isControlled ? expanded : uncontrolled

  function toggle(id: string) {
    const next = openIds.includes(id)
      ? openIds.filter((openId) => openId !== id)
      : [...openIds, id]
    if (!isControlled) setUncontrolled(next)
    onExpandedChange?.(next)
  }

  return (
    <div
      data-slot="outline-view"
      data-density={density}
      className={cn('flex flex-col', className)}
    >
      {items.map((item) => (
        <OutlineNode
          key={item.id}
          item={item}
          level={0}
          openIds={openIds}
          onToggle={toggle}
          onSelect={onSelect}
          density={density}
        />
      ))}
    </div>
  )
}

function OutlineNode({
  item,
  level,
  openIds,
  onToggle,
  onSelect,
  density,
}: {
  readonly item: OutlineViewItem
  readonly level: number
  readonly openIds: readonly string[]
  readonly onToggle: (id: string) => void
  readonly onSelect?: (id: string) => void
  readonly density: ControlDensity
}) {
  const nested = item.children ?? []
  const hasChildren = nested.length > 0
  const isOpen = openIds.includes(item.id)

  return (
    <>
      <div
        data-slot="outline-view-row"
        className={cn('flex items-center gap-kro-tiny', DENSITY_ROW[density])}
        style={{ paddingLeft: `calc(${level} * var(--kro-space-medium))` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={
              isOpen ? `Collapse ${item.title}` : `Expand ${item.title}`
            }
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-kro-small text-kro-fore',
              DENSITY_BOX[density],
              'outline-none focus-visible:shadow-[var(--kro-ring)]',
            )}
            onClick={() => onToggle(item.id)}
          >
            <ChevronRight
              aria-hidden
              size={16}
              strokeWidth={2}
              className={cn(
                'kro-motion-quick transition-transform',
                isOpen && 'rotate-90',
              )}
            />
          </button>
        ) : (
          <span
            aria-hidden
            className={cn('inline-block shrink-0', DENSITY_BOX[density])}
          />
        )}
        <button
          type="button"
          className={cn(
            'min-w-0 flex-1 px-kro-tiny text-left text-kro-fore',
            DENSITY_ROW[density],
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          onClick={() => onSelect?.(item.id)}
        >
          {item.title}
        </button>
      </div>
      {hasChildren && isOpen
        ? nested.map((child) => (
            <OutlineNode
              key={child.id}
              item={child}
              level={level + 1}
              openIds={openIds}
              onToggle={onToggle}
              onSelect={onSelect}
              density={density}
            />
          ))
        : null}
    </>
  )
}
