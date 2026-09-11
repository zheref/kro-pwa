import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { GlassPanel } from '../../system/glass/GlassPanel'
import { DENSITY_ROW } from '../../system/density'
import { ICON_SIZE } from '../../system/icons/icons'
import { cn } from '../../system/utils/cn'
import { densityForFluentSize } from '../sizes'

/**
 * Nav — Fluent 2 destination list, painted with KroGlass.
 *
 * Nested categories are disclosure rows: the chevron rotation AND
 * `aria-expanded` are the open signal. The selected row is pressed
 * glass AND `aria-current="page"` — never a tint alone. Selecting a
 * row reports an id; this pane never navigates (`RC-17`).
 */

export interface NavChild {
  readonly id: string
  readonly label: string
}

export interface NavItem {
  readonly id: string
  readonly label: string
  readonly icon?: LucideIcon
  readonly children?: readonly NavChild[]
}

export type NavAppearance = 'default' | 'subtle'
export type NavSize = 'small' | 'medium'

export interface NavProps {
  readonly items: readonly NavItem[]
  readonly selectedId?: string
  readonly onSelect: (id: string) => void
  readonly appearance?: NavAppearance
  readonly size?: NavSize
  readonly className?: string
}

function initialExpanded(
  items: readonly NavItem[],
  selectedId: string | undefined,
): readonly string[] {
  if (selectedId === undefined) return []
  return items
    .filter((item) => {
      if ((item.children?.length ?? 0) === 0) return false
      if (item.id === selectedId) return true
      return item.children?.some((child) => child.id === selectedId) ?? false
    })
    .map((item) => item.id)
}

function rowClass(isSelected: boolean, densityClass: string): string {
  return cn(
    'flex w-full items-center gap-kro-small rounded-kro-small',
    'px-kro-small',
    densityClass,
    'text-left text-kro-fore outline-none',
    'focus-visible:shadow-[var(--kro-ring)]',
    isSelected
      ? 'kro-glass kro-glass--pressed font-semibold'
      : 'hover:bg-kro-back-inner',
  )
}

export function Nav({
  items,
  selectedId,
  onSelect,
  appearance = 'default',
  size = 'medium',
  className,
}: NavProps) {
  const density = densityForFluentSize(size)
  const densityClass = DENSITY_ROW[density]
  const [expandedIds, setExpandedIds] = useState<readonly string[]>(() =>
    initialExpanded(items, selectedId),
  )

  function toggle(id: string) {
    setExpandedIds((current) =>
      current.includes(id)
        ? current.filter((openId) => openId !== id)
        : [...current, id],
    )
  }

  return (
    <GlassPanel
      as="nav"
      kind="sidebar"
      data-slot="nav"
      data-appearance={appearance}
      data-size={size}
      data-density={density}
      aria-label="Navigation"
      className={cn('p-kro-tiny', className)}
      style={{ width: 240 }}
    >
      {items.map((item) => {
        const nested = item.children ?? []
        const hasChildren = nested.length > 0
        const isExpanded = expandedIds.includes(item.id)
        const isSelected = item.id === selectedId
        const Icon = item.icon

        return (
          <div key={item.id} className="flex flex-col">
            {hasChildren ? (
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-current={isSelected ? 'page' : undefined}
                className={rowClass(isSelected, densityClass)}
                onClick={() => toggle(item.id)}
              >
                <ChevronRight
                  aria-hidden
                  size={16}
                  strokeWidth={2}
                  className={cn(
                    'kro-motion-quick shrink-0 transition-transform',
                    isExpanded && 'rotate-90',
                  )}
                />
                {Icon === undefined ? null : (
                  <Icon
                    aria-hidden="true"
                    size={ICON_SIZE.medium}
                    className="shrink-0"
                  />
                )}
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            ) : (
              <button
                type="button"
                aria-current={isSelected ? 'page' : undefined}
                className={rowClass(isSelected, densityClass)}
                onClick={() => onSelect(item.id)}
              >
                {Icon === undefined ? null : (
                  <Icon
                    aria-hidden="true"
                    size={ICON_SIZE.medium}
                    className="shrink-0"
                  />
                )}
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            )}
            {hasChildren && isExpanded
              ? nested.map((child) => {
                  const childSelected = child.id === selectedId
                  return (
                    <button
                      key={child.id}
                      type="button"
                      aria-current={childSelected ? 'page' : undefined}
                      className={cn(
                        rowClass(childSelected, densityClass),
                        'pl-kro-large',
                      )}
                      onClick={() => onSelect(child.id)}
                    >
                      <span className="min-w-0 truncate">{child.label}</span>
                    </button>
                  )
                })
              : null}
          </div>
        )
      })}
    </GlassPanel>
  )
}
