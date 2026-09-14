import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * ColumnView — HIG "Column views", painted with KroTokens.
 *
 * Browse a hierarchy by revealing the next level in a column to the
 * right — Finder's column view, painted with the live accent for the
 * selected row. This is presentational: the caller owns the path
 * (`selected`) and what "select" means. No fetch, no store.
 *
 * Colour is not the only selected signal: `aria-current` marks the
 * current row for assistive tech, and the accent fill + on-accent
 * type are the visual pair.
 */

export interface ColumnViewItem {
  readonly id: string
  readonly label: string
}

export interface ColumnViewColumn {
  readonly id: string
  readonly title: string
  readonly items: readonly ColumnViewItem[]
}

export interface ColumnViewProps {
  readonly columns: readonly ColumnViewColumn[]
  readonly selected: Readonly<Record<number, string>>
  readonly onSelect: (columnIndex: number, itemId: string) => void
  readonly className?: string
  readonly density?: ControlDensity
}

export function ColumnView({
  columns,
  selected,
  onSelect,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: ColumnViewProps) {
  return (
    <div
      data-slot="column-view"
      data-density={density}
      className={cn('flex min-h-[240px] min-w-0 overflow-x-auto', className)}
    >
      {columns.map((column, columnIndex) => (
        <div
          key={column.id}
          data-slot="column-view-column"
          className="flex min-h-0 min-w-[180px] flex-1 flex-col overflow-auto border-r border-kro-hairline last:border-r-0"
        >
          <h3 className="m-0 px-kro-medium py-kro-small text-[13px] font-semibold uppercase tracking-wide text-kro-fore-secondary">
            {column.title}
          </h3>
          {column.items.map((item) => {
            const isSelected = selected[columnIndex] === item.id
            return (
              <button
                key={item.id}
                type="button"
                data-slot="column-view-row"
                aria-current={isSelected ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center px-kro-medium text-left',
                  DENSITY_ROW[density],
                  'outline-none focus-visible:shadow-[var(--kro-ring)]',
                  isSelected
                    ? 'bg-kro-accent text-kro-on-accent'
                    : 'bg-transparent text-kro-fore',
                )}
                onClick={() => onSelect(columnIndex, item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
