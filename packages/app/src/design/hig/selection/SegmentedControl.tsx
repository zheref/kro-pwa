import type { ReactNode } from 'react'
import {
  CONTROL_RADIUS,
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
  SELECTED_CONTROL_STYLE,
} from '../../system/density'
import { colorVar } from '../../system/tokens/roles'
import { cn } from '../../system/utils/cn'

/**
 * SegmentedControl — HIG "Segmented controls", canon's `TabSegmentedControl`
 * selection row (`KroUI/Components/TabSegmentedControl.swift`).
 *
 * Two to five mutually exclusive options in one capsule. Domain-less
 * (`RC-14`): options, a value and a closure — it never learns what it selects.
 * Canon's builder also carries each segment's body; the web keeps the body with
 * the caller, which already switches on the value.
 *
 * - The track is a faint fill. The selected segment takes the design
 *   system's selected fill (`SELECTED_CONTROL_STYLE`: white on dark, black on
 *   light) — or, when `selectionTint` is given (canon's `selectionAccent`), a
 *   glass segment tinted with it.
 * - Corners follow `CONTROL_RADIUS`: the compact menu-row radius on desktop,
 *   a capsule on touch.
 * - `compact` (the desktop default) and `comfortable` (touch) follow the design
 *   system's density scale.
 * - `disabled` dims the whole control once and takes it out of interaction —
 *   the session's mode toggle mid-session.
 * - Each segment is a toggle button (`aria-pressed`) inside a labelled group,
 *   the same pattern the session toggle shipped with.
 */

export interface SegmentedOption<T extends string> {
  readonly value: T
  readonly label: string
  readonly icon?: ReactNode
}

export interface SegmentedControlProps<T extends string> {
  readonly options: readonly SegmentedOption<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
  /** The group's accessible name. */
  readonly label: string
  readonly density?: ControlDensity
  /** A palette colour for the selected capsule's glass; none = plain glass. */
  readonly selectionTint?: string | null
  readonly disabled?: boolean
  readonly className?: string
}

const SEGMENT_PADDING: Record<ControlDensity, string> = {
  compact: '4px 10px',
  comfortable: '8px 16px',
}

const SEGMENT_MIN_HEIGHT: Record<ControlDensity, string> = {
  // Compact is the pointer density; comfortable is touch, so it takes the
  // 44px touch target (WCAG 2.5.8 / HIG), not the 28px pointer one.
  compact: 'var(--kro-size-min-pointer-target)',
  comfortable: 'var(--kro-size-min-touch-target)',
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  density = DEFAULT_CONTROL_DENSITY,
  selectionTint = null,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-disabled={disabled || undefined}
      data-kro-segmented=""
      data-kro-density={density}
      className={cn(
        'inline-flex max-w-full',
        // The design system's one disabled dim, applied once on the group.
        disabled && 'opacity-[var(--kro-opacity-disabled)]',
        className,
      )}
      style={{
        borderRadius: CONTROL_RADIUS[density],
        background: `color-mix(in srgb, ${colorVar('fore')} 10%, transparent)`,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {options.map((option) => {
        const isSelected = option.value === value
        const isTinted = isSelected && selectionTint !== null
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            data-kro-segment={isSelected ? 'selected' : 'available'}
            onClick={() => {
              if (!isSelected) onChange(option.value)
            }}
            className={cn(
              'inline-flex items-center justify-center gap-1 font-medium outline-none focus-visible:shadow-[var(--kro-ring)]',
              DENSITY_TYPE[density],
              isTinted && 'kro-glass kro-glass--tinted',
            )}
            style={{
              padding: SEGMENT_PADDING[density],
              minHeight: SEGMENT_MIN_HEIGHT[density],
              borderRadius: CONTROL_RADIUS[density],
              color: colorVar('fore'),
              ...(isSelected && !isTinted ? SELECTED_CONTROL_STYLE : {}),
              ...(isTinted
                ? {
                    color: colorVar('absolute'),
                    ['--kro-glass-tint' as string]: selectionTint,
                  }
                : {}),
            }}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
