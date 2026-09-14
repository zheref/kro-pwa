import type { ReactNode } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Collection — HIG "Collections", painted with KroTokens.
 *
 * A CSS grid of equally sized cells for browsing many items of one
 * kind — endeavor types, hosts, templates. Cells sit on the recessed
 * `back-next` field with the field radius so they read as tiles, not
 * as a table. The gap is the small spacing token; the column count is
 * a number, not a breakpoint table.
 */

export interface CollectionProps {
  readonly columns?: number
  readonly children: ReactNode
  readonly className?: string
  readonly density?: ControlDensity
}

export function Collection({
  columns = 2,
  children,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: CollectionProps) {
  return (
    <div
      data-slot="collection"
      data-columns={columns}
      data-density={density}
      className={cn('grid gap-kro-small', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  )
}

export interface CollectionItemProps {
  readonly children: ReactNode
  readonly className?: string
  readonly density?: ControlDensity
}

export function CollectionItem({
  children,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: CollectionItemProps) {
  return (
    <div
      data-slot="collection-item"
      data-density={density}
      className={cn(
        'flex items-center justify-center rounded-kro-field bg-kro-back-next px-kro-medium text-kro-fore',
        DENSITY_ROW[density],
        className,
      )}
    >
      {children}
    </div>
  )
}
