import type { CSSProperties, ReactNode } from 'react'
import {
  TOOLBAR_GLYPH_BUTTON,
  TOOLBAR_GLYPH_BUTTON_PX,
} from '../../system/rowHighlight'
import { cn } from '../../system/utils/cn'

/** One icon option in a `CapsuleSegmentGroup`. */
export interface CapsuleSegment<Value extends string> {
  readonly value: Value
  /** Accessible name and tooltip. */
  readonly label: string
  /** Rendered glyph; receives whether this option is the selected one. */
  readonly icon: (isSelected: boolean) => ReactNode
}

export interface CapsuleSegmentGroupProps<Value extends string> {
  /** The group's accessible name. */
  readonly label: string
  readonly options: readonly CapsuleSegment<Value>[]
  /** The selected option, or `null` when none is. */
  readonly value: Value | null
  /**
   * Called with the pressed option — including the selected one, so a caller
   * can treat re-pressing as "deselect" (the detail pane does).
   */
  readonly onSelect: (value: Value) => void
  /** Side of each option; defaults to the toolbar glyph target. */
  readonly itemSize?: number
  readonly className?: string
  readonly testId?: string
}

/** Inner corners: the toolbar glyph corner. Outer corners: the capsule's. */
const INNER_RADIUS = 'var(--kro-radius-small, 8px)'
const OUTER_RADIUS = '9999px'

/**
 * The corners an option wears given its position. The two end options take
 * the capsule's own full rounding on their outer side, so a selected end fill
 * follows the capsule's curve instead of sitting as a square inside it.
 */
export function capsuleSegmentRadius(
  index: number,
  count: number,
): CSSProperties['borderRadius'] {
  const leading = index === 0 ? OUTER_RADIUS : INNER_RADIUS
  const trailing = index === count - 1 ? OUTER_RADIUS : INNER_RADIUS
  return `${leading} ${trailing} ${trailing} ${leading}`
}

/**
 * A capsule of mutually exclusive icon options — at most one selected. Built
 * for glyph toolbars over the window gradient: a translucent white track with
 * the selected option filled solid white.
 *
 * Domain-less (`RC-14`): options, selection and intent all arrive as props.
 * Each option is a toggle button (`aria-pressed`) rather than a radio, because
 * callers may let the selected option be pressed again to clear the selection.
 */
export function CapsuleSegmentGroup<Value extends string>({
  label,
  options,
  value,
  onSelect,
  itemSize = TOOLBAR_GLYPH_BUTTON_PX,
  className,
  testId,
}: CapsuleSegmentGroupProps<Value>) {
  return (
    <div
      role="group"
      aria-label={label}
      data-testid={testId}
      className={cn(
        'flex items-center rounded-full bg-white/15 p-0.5',
        className,
      )}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={isSelected}
            title={option.label}
            onClick={() => onSelect(option.value)}
            className={cn(
              TOOLBAR_GLYPH_BUTTON,
              'transition-colors',
              isSelected
                ? 'bg-white text-black/85 hover:bg-white hover:text-black/85'
                : 'kro-on-gradient',
            )}
            style={{
              width: itemSize,
              height: itemSize - 4,
              borderRadius: capsuleSegmentRadius(index, options.length),
            }}
          >
            {option.icon(isSelected)}
          </button>
        )
      })}
    </div>
  )
}
