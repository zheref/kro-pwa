import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import {
  CONTROL_RADIUS,
  type ControlDensity,
  DENSITY_TYPE,
  SELECTED_CONTROL_STYLE,
  controlMinSizeVar,
} from '../../system/density'
import { colorVar } from '../../system/tokens/roles'
import { ShortcutHint } from '../../system/primitives/button'
import { cn } from '../../system/utils/cn'

/**
 * A property pill — one capsule that shows a property's value and, when the
 * property can be unset, carries its own trailing clear (X) button.
 *
 * The two actions are TWO sibling buttons inside one shape, never nested: a
 * button inside a button is invalid HTML and reaches a screen reader as one
 * control. A hairline divider separates them so the capsule still reads as a
 * single property.
 *
 * Domain-less (`RC-14`): it knows labels and callbacks, nothing about what the
 * property means. The spec is the session sheet's preset pill — padding per
 * density, `CONTROL_RADIUS[density]`, a faint foreground fill, and the design
 * system's selected fill while its panel is expanded.
 */

/** The preset-pill padding, per density. */
export const PROPERTY_PILL_PADDING: Record<ControlDensity, string> = {
  compact: '4px 10px',
  comfortable: '8px 16px',
}

export interface PropertyPillProps {
  readonly glyph?: ReactNode
  readonly label: string
  /** Whether the property carries a value — unset labels read secondary. */
  readonly isSet: boolean
  /** Whether the property's editor is open — paints the selected fill. */
  readonly isExpanded: boolean
  readonly density: ControlDensity
  readonly accessibilityLabel: string
  readonly onSelect: () => void
  /** Present → the trailing clear button is drawn. */
  readonly onClear?: () => void
  /** The clear button's accessible name. Defaults to `Clear <label>`. */
  readonly clearLabel?: string
  /**
   * The chord that opens this property, as `aria-keyshortcuts` names it
   * (`Alt+V`). Set on the main button for assistive tech.
   */
  readonly keyShortcuts?: string
  /** A pointer tooltip for the main button — e.g. the chord, spelled ⌥V. */
  readonly tooltip?: string
  /**
   * The chord (`⌥V`) as a keycap floated over the pill's top-leading corner.
   * It takes no layout space, so it can never widen the row.
   */
  readonly shortcutHint?: string
  /** Whether the hint is visible — e.g. only while Option is held. */
  readonly revealShortcutHint?: boolean
}

/** The widest a pill's label renders before it ellipsizes. */
export const PROPERTY_PILL_LABEL_MAX_WIDTH = '7.5rem'

export function PropertyPill({
  glyph,
  label,
  isSet,
  isExpanded,
  density,
  accessibilityLabel,
  onSelect,
  onClear,
  clearLabel,
  keyShortcuts,
  tooltip,
  shortcutHint,
  revealShortcutHint = true,
}: PropertyPillProps) {
  const minSize = controlMinSizeVar(density)
  const foreground = isExpanded
    ? SELECTED_CONTROL_STYLE.color
    : isSet
      ? colorVar('fore')
      : colorVar('foreSecondary')

  return (
    <span
      data-slot="property-pill"
      data-kro-density={density}
      className={cn(
        'relative inline-flex shrink-0 items-stretch whitespace-nowrap',
        DENSITY_TYPE[density],
      )}
      style={{
        minHeight: minSize,
        borderRadius: CONTROL_RADIUS[density],
        background: `color-mix(in srgb, ${colorVar('fore')} 10%, transparent)`,
        ...(isExpanded
          ? { background: SELECTED_CONTROL_STYLE.background }
          : {}),
      }}
    >
      <button
        type="button"
        aria-label={accessibilityLabel}
        aria-expanded={isExpanded}
        aria-keyshortcuts={keyShortcuts}
        title={tooltip}
        onClick={onSelect}
        className="inline-flex items-center gap-1.5 outline-none focus-visible:shadow-[var(--kro-ring)]"
        style={{
          padding: PROPERTY_PILL_PADDING[density],
          fontWeight: isExpanded ? 700 : 500,
          color: foreground,
          borderRadius: CONTROL_RADIUS[density],
        }}
      >
        {shortcutHint === undefined ? null : (
          <ShortcutHint placement="keycap" reveal={revealShortcutHint}>
            {shortcutHint}
          </ShortcutHint>
        )}
        {glyph}
        {/* Capped so a long value (a full date, a detailed repeat rule) can
            never widen its row: past the cap it ellipsizes, and the full value
            stays in the tooltip and the accessible name. */}
        <span
          data-slot="property-pill-label"
          title={label}
          className="truncate"
          style={{ maxWidth: PROPERTY_PILL_LABEL_MAX_WIDTH }}
        >
          {label}
        </span>
      </button>
      {onClear === undefined ? null : (
        <>
          <span
            aria-hidden
            data-slot="property-pill-divider"
            className="my-1.5 w-px shrink-0"
            style={{ backgroundColor: colorVar('hairline') }}
          />
          <button
            type="button"
            aria-label={clearLabel ?? `Clear ${label}`}
            onClick={onClear}
            className="inline-flex items-center justify-center outline-none focus-visible:shadow-[var(--kro-ring)]"
            style={{
              minWidth: minSize,
              color: foreground,
              borderRadius: CONTROL_RADIUS[density],
            }}
          >
            <X size={12} aria-hidden />
          </button>
        </>
      )}
    </span>
  )
}
