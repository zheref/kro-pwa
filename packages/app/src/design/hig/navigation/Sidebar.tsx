import type { LucideIcon } from 'lucide-react'
import { GlassPanel } from '../../system/glass/GlassPanel'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { ICON_SIZE } from '../../system/icons/icons'
import { cn } from '../../system/utils/cn'

/**
 * Sidebar — HIG "Sidebars", a presentational destination list.
 *
 * The selected row is pressed glass (or a raised card), never a tint
 * alone, and it carries `aria-current="page"`. Sections are small-caps
 * labels in the secondary foreground. Selecting a row reports an id;
 * this pane never navigates (`RC-17`).
 */

export interface SidebarItem {
  readonly id: string
  readonly label: string
  readonly icon?: LucideIcon
  readonly section?: string
}

export interface SidebarProps {
  readonly title?: string
  readonly items: readonly SidebarItem[]
  readonly selectedId?: string
  readonly onSelect: (id: string) => void
  readonly width?: number
  readonly className?: string
  readonly density?: ControlDensity
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

export function Sidebar({
  title,
  items,
  selectedId,
  onSelect,
  width = 240,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: SidebarProps) {
  const groups = groupSidebarItems(items)

  return (
    <GlassPanel
      kind="sidebar"
      data-slot="sidebar"
      data-density={density}
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
            const isSelected = item.id === selectedId
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isSelected ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-kro-small rounded-kro-small px-kro-small',
                  DENSITY_ROW[density],
                  'text-left text-kro-fore outline-none',
                  'focus-visible:shadow-[var(--kro-ring)]',
                  isSelected
                    ? 'kro-glass kro-glass--pressed font-semibold'
                    : 'hover:bg-kro-back-inner',
                )}
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
            )
          })}
        </div>
      ))}
    </GlassPanel>
  )
}
