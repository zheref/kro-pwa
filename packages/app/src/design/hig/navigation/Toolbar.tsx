import type { ReactNode } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Toolbar — HIG "Toolbars", a glass control cluster.
 *
 * Groups are passed in as nodes (usually icon buttons). A vertical hairline
 * separates one group from the next. The toolbar does not own the actions
 * and does not navigate.
 */

export interface ToolbarProps {
  readonly groups: readonly (readonly ReactNode[])[]
  readonly className?: string
  readonly density?: ControlDensity
}

export function Toolbar({
  groups,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: ToolbarProps) {
  return (
    <div
      data-slot="toolbar"
      data-density={density}
      role="toolbar"
      className={cn(
        'kro-glass kro-glass--control inline-flex items-center gap-kro-tiny',
        density === 'compact' ? 'p-0.5' : 'p-kro-tiny',
        className,
      )}
    >
      {groups.map((group, groupIndex) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: toolbar groups are positional clusters of caller nodes — nothing reorders them
          key={`toolbar-group-${groupIndex}`}
          className="inline-flex items-center gap-kro-tiny"
        >
          {groupIndex === 0 ? null : (
            <span
              aria-hidden="true"
              className={cn(
                'mx-kro-tiny w-px self-center bg-kro-hairline',
                density === 'compact' ? 'h-4' : 'h-7',
              )}
            />
          )}
          {group}
        </span>
      ))}
    </div>
  )
}
