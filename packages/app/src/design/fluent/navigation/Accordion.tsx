import { ChevronRight } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { DENSITY_ROW } from '../../system/density'
import { cn } from '../../system/utils/cn'
import { type FluentControlSize, densityForFluentSize } from '../sizes'

/**
 * Accordion — Fluent 2 grouped sections that open and close.
 *
 * Exclusive by default (one panel at a time). `multiple` lets several
 * stay open; `collapsible` (default true) lets the last open panel
 * close. The chevron rotation AND `aria-expanded` are the open signal
 * — colour is never it.
 *
 * Built here rather than wrapping HIG Disclosure: exclusive and
 * multiple would fight a single native `<details>`.
 */

export interface AccordionItem {
  readonly id: string
  readonly title: string
  readonly content: ReactNode
}

export interface AccordionProps {
  readonly items: readonly AccordionItem[]
  readonly multiple?: boolean
  readonly collapsible?: boolean
  readonly size?: FluentControlSize
  readonly defaultOpenIds?: readonly string[]
  readonly openIds?: readonly string[]
  readonly onOpenChange?: (ids: readonly string[]) => void
  readonly className?: string
}

function resolveOpenIds(
  items: readonly AccordionItem[],
  requested: readonly string[],
  multiple: boolean,
  collapsible: boolean,
): readonly string[] {
  const known = new Set(items.map((item) => item.id))
  const filtered = requested.filter((id) => known.has(id))
  const exclusive = multiple ? filtered : filtered.slice(0, 1)
  if (!collapsible && exclusive.length === 0) {
    const first = items[0]
    return first === undefined ? [] : [first.id]
  }
  return exclusive
}

function nextOpenIds(
  current: readonly string[],
  id: string,
  multiple: boolean,
  collapsible: boolean,
): readonly string[] | undefined {
  const isOpen = current.includes(id)
  let next: readonly string[]
  if (multiple) {
    next = isOpen ? current.filter((openId) => openId !== id) : [...current, id]
  } else {
    next = isOpen ? [] : [id]
  }
  if (!collapsible && next.length === 0) {
    return undefined
  }
  return next
}

export function Accordion({
  items,
  multiple = false,
  collapsible = true,
  size = 'medium',
  defaultOpenIds,
  openIds,
  onOpenChange,
  className,
}: AccordionProps) {
  const baseId = useId()
  const density = densityForFluentSize(size)
  const isControlled = openIds !== undefined
  const [uncontrolled, setUncontrolled] = useState<readonly string[]>(() =>
    resolveOpenIds(items, defaultOpenIds ?? [], multiple, collapsible),
  )
  const current = isControlled ? openIds : uncontrolled

  function toggle(id: string) {
    const next = nextOpenIds(current, id, multiple, collapsible)
    if (next === undefined) return
    if (!isControlled) setUncontrolled(next)
    onOpenChange?.(next)
  }

  return (
    <div
      data-slot="accordion"
      data-size={size}
      data-density={density}
      className={cn('flex w-full flex-col', className)}
    >
      {items.map((item, index) => {
        const isOpen = current.includes(item.id)
        const headerId = `${baseId}-${item.id}-header`
        const panelId = `${baseId}-${item.id}-panel`
        return (
          <div key={item.id} data-slot="accordion-item">
            {index === 0 ? null : (
              <div
                aria-hidden
                data-slot="accordion-divider"
                className="h-px bg-kro-hairline"
              />
            )}
            <button
              type="button"
              id={headerId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className={cn(
                'flex w-full items-center gap-kro-small',
                size === 'large' ? 'px-kro-medium' : 'px-kro-small',
                DENSITY_ROW[density],
                'text-left text-kro-fore outline-none',
                'focus-visible:shadow-[var(--kro-ring)]',
              )}
              onClick={() => toggle(item.id)}
            >
              <ChevronRight
                aria-hidden
                size={16}
                strokeWidth={2}
                className={cn(
                  'kro-motion-quick shrink-0 transition-transform',
                  isOpen && 'rotate-90',
                )}
              />
              <span className="min-w-0 flex-1 font-medium">{item.title}</span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={!isOpen}
              data-slot="accordion-panel"
              className={cn(
                size === 'large' ? 'px-kro-medium' : 'px-kro-small',
                'pb-kro-small text-kro-fore',
              )}
            >
              {item.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
