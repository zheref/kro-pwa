import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { GlassPanel } from '../../system/glass/GlassPanel'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { ICON_SIZE } from '../../system/icons/icons'
import { cn } from '../../system/utils/cn'

/**
 * Sidebar — a presentational destination list.
 *
 * The selected row is pressed glass, never a tint alone, and it carries
 * `aria-current="page"`. Sections are small-caps labels. Nested
 * categories are disclosure rows: the chevron rotation AND
 * `aria-expanded` are the open signal. Selecting a row reports an id;
 * this pane never navigates (`RC-17`).
 *
 * Fluent calls this Nav; Primer calls it NavList.
 */

export interface SidebarChild {
  readonly id: string
  readonly label: string
}

export interface SidebarItem {
  readonly id: string
  readonly label: string
  readonly icon?: LucideIcon
  readonly section?: string
  readonly children?: readonly SidebarChild[]
}

export type SidebarAppearance = 'default' | 'subtle'

export interface SidebarProps {
  readonly title?: string
  readonly items: readonly SidebarItem[]
  readonly selectedId?: string
  readonly onSelect: (id: string) => void
  readonly width?: number
  readonly className?: string
  readonly density?: ControlDensity
  readonly appearance?: SidebarAppearance
}

interface SidebarGroup {
  readonly section: string | undefined
  readonly items: readonly SidebarItem[]
}

function groupSidebarItems(items: readonly SidebarItem[]): SidebarGroup[] {
  const groups: Array<{ section: string | undefined; items: SidebarItem[] }> =
    []
  for (const item of items) {
    const last = groups.at(-1)
    if (last !== undefined && last.section === item.section) {
      last.items.push(item)
    } else {
      groups.push({ section: item.section, items: [item] })
    }
  }
  return groups
}

function initialExpanded(
  items: readonly SidebarItem[],
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

export function Sidebar({
  title,
  items,
  selectedId,
  onSelect,
  width = 240,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  appearance = 'default',
}: SidebarProps) {
  const groups = groupSidebarItems(items)
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
      kind="sidebar"
      data-slot="sidebar"
      data-density={density}
      data-appearance={appearance}
      aria-label={title ?? 'Sidebar'}
      className={cn('p-kro-tiny', className)}
      style={{ width }}
    >
      {title === undefined ? null : (
        <p className="px-kro-small py-kro-tiny font-semibold text-kro-fore">
          {title}
        </p>
      )}
      {groups.map((group, groupIndex) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: section headers have no stable id — grouping is derived from consecutive `section` strings
          key={`section-${group.section ?? 'none'}-${groupIndex}`}
          className="flex flex-col"
        >
          {group.section === undefined ? null : (
            <p
              className={cn(
                'px-kro-small pt-kro-small pb-kro-tiny',
                'font-semibold text-[11px] text-kro-fore-secondary uppercase tracking-wider',
              )}
            >
              {group.section}
            </p>
          )}
          {group.items.map((item) => {
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
                          <span className="min-w-0 truncate">
                            {child.label}
                          </span>
                        </button>
                      )
                    })
                  : null}
              </div>
            )
          })}
        </div>
      ))}
    </GlassPanel>
  )
}
