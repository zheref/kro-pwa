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
 * TabBar — HIG "Tab bars", a presentational floating dock.
 *
 * Two to five top-level destinations as a glass capsule. The selected tab
 * is the accent colour AND a filled indicator dot under the 11px label —
 * colour is never the only signal. Selecting a tab reports an id; this
 * dock never navigates (`RC-17`).
 */

export interface TabBarItem {
  readonly id: string
  readonly label: string
  readonly icon: LucideIcon
}

export interface TabBarProps {
  readonly items: readonly TabBarItem[]
  readonly selectedId: string
  readonly onSelect: (id: string) => void
  readonly className?: string
  readonly density?: ControlDensity
}

export function TabBar({
  items,
  selectedId,
  onSelect,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: TabBarProps) {
  return (
    <GlassPanel
      as="nav"
      kind="dock"
      data-slot="tab-bar"
      data-density={density}
      aria-label="Tabs"
      className={cn(
        'w-full items-stretch justify-around px-kro-tiny py-kro-tiny',
        className,
      )}
    >
      {items.map((item) => {
        const isSelected = item.id === selectedId
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            aria-current={isSelected ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5',
              DENSITY_ROW[density],
              'rounded-kro-small outline-none',
              'focus-visible:shadow-[var(--kro-ring)]',
              isSelected
                ? 'font-semibold text-kro-accent'
                : 'text-kro-fore-secondary',
            )}
            onClick={() => onSelect(item.id)}
          >
            <Icon aria-hidden="true" size={ICON_SIZE.medium} />
            <span className="text-[11px] leading-none">{item.label}</span>
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 size-1 rounded-kro-pill',
                isSelected ? 'bg-kro-accent' : 'bg-transparent',
              )}
            />
          </button>
        )
      })}
    </GlassPanel>
  )
}
