import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Separator — a hairline, optionally labelled.
 *
 * A 1px `hairline` rule. When `label` is set it becomes a labelled
 * divider: the words sit in `fore-secondary` so the line is never the
 * only way the group is named.
 */

export interface SeparatorProps {
  readonly label?: string
  readonly className?: string
  readonly density?: ControlDensity
}

export function Separator({
  label,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: SeparatorProps) {
  if (label === undefined) {
    return (
      <hr
        data-slot="separator"
        data-density={density}
        className={cn('m-0 h-px border-0 bg-kro-hairline', className)}
      />
    )
  }

  return (
    // biome-ignore lint/a11y/useFocusableInteractive: a labelled hairline is not a keyboard widget
    <div
      data-slot="separator"
      data-density={density}
      // biome-ignore lint/a11y/useAriaPropsForRole: this is a named divider, not a range separator
      role="separator"
      aria-label={label}
      className={cn('flex items-center gap-kro-small', className)}
    >
      <span
        aria-hidden="true"
        className="h-px min-w-kro-medium flex-1 bg-kro-hairline"
      />
      <span
        className={cn(
          'shrink-0 text-kro-fore-secondary',
          DENSITY_TYPE[density],
        )}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className="h-px min-w-kro-medium flex-1 bg-kro-hairline"
      />
    </div>
  )
}
