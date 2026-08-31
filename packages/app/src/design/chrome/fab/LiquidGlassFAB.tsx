import type { CSSProperties } from 'react'
import { type SfSymbolName, iconForSymbol } from '../../system/icons/icons'
import { Button } from '../../system/primitives/button'
import { cn } from '../../system/utils/cn'
import { CHROME_LAYOUT } from '../layout/chromeLayout'

/**
 * The floating action button — a 62px glass disc anchored bottom-trailing.
 *
 * Port of `KroUI/Components/LiquidGlassFAB.swift`. Owns no state: the caller
 * hands it a glyph, a label and a handler, which is what lets one component
 * serve Plan, Do and Earn with a per-tab action (`#17`/`#19`/`#28` supply the
 * glyph; this kit does not know they exist).
 *
 * THE MATERIAL. Canon uses iOS 26's first-party `glassEffect(.regular, in:
 * Circle())`, with a hand-built `.ultraThinMaterial` + tint + hairline stack as
 * the pre-26 fallback. The web has one material either way — KroGlass, the
 * zheref.io recipe the epic's Design Direction names — and the design system
 * already exposes it as `Button`'s `glass` variant, which carries the
 * `kro-glass--control` blur. `control` rather than `surface` for canon's own
 * reason: a 20px blur behind a 24px glyph reads as smeared.
 *
 * Composed from `Button` rather than from `GlassSurface` deliberately. A FAB is
 * a button, and `Button` already owns the parts that are easy to get wrong on
 * one: `type="button"` (so a FAB inside a form does not submit it), the single
 * disabled fade, the focus ring, and the press response.
 *
 * THE HIT AREA, and why the web port drops canon's padding. `LiquidGlassFAB`
 * pads itself by `hitAreaInset` (8pt) to widen the tap target beyond the 62pt
 * disc, which is why everything decorating its edge has to inset by the same
 * amount or it traces the padding instead of the button. Here the disc IS the
 * target: 62px clears the 44px touch floor and the 28px pointer floor with room
 * to spare, so there is no padding to compensate for and `RotatingGlow` is
 * given `inset={0}`. The constant survives as `CHROME_LAYOUT.fabHitAreaInset`
 * for a caller that does pad.
 */

export interface LiquidGlassFABProps {
  /** The SF Symbol name, resolved through the design system's lucide mapping. */
  readonly glyph: SfSymbolName
  /** Spoken name for the action. Required — a bare glyph names nothing. */
  readonly accessibilityLabel: string
  readonly onClick?: () => void
  /** Diameter in px. Canon's 62 unless a surface has a reason. */
  readonly size?: number
  readonly disabled?: boolean
  readonly className?: string
  readonly style?: CSSProperties
  /** Wired by `LiquidGlassFABMenu`; a bare FAB has no popup to describe. */
  readonly 'aria-expanded'?: boolean
  readonly 'aria-haspopup'?: 'menu'
  readonly 'aria-controls'?: string
}

/** Canon: `.font(.system(size: 24, weight: .semibold))`. */
export const FAB_GLYPH_SIZE = 24

export function LiquidGlassFAB({
  glyph,
  accessibilityLabel,
  onClick,
  size = CHROME_LAYOUT.fabDiameter,
  disabled = false,
  className,
  style,
  ...aria
}: LiquidGlassFABProps) {
  const Glyph = iconForSymbol(glyph)

  return (
    <Button
      variant="glass"
      size="icon"
      aria-label={accessibilityLabel}
      disabled={disabled}
      onClick={onClick}
      data-kro-fab=""
      className={cn(className)}
      // Inline, not a utility. `size="icon"` brings `size-11 rounded-kro-field`
      // and the `glass` variant brings `px-kro-medium`; `twMerge` cannot merge
      // either away, because `kro-field` and `kro-pill` are project theme
      // values it has no config for (see the note in `cn`). An inline style
      // beats a stylesheet rule outright, which is also what makes the disc's
      // 62px assertable as a value rather than as a class name.
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        padding: 0,
        ...style,
      }}
      {...aria}
    >
      {/*
        `size-6` rather than the base rule's `size-5`: canon draws the glyph at
        24pt. The explicit class is also what makes Button's
        `[&_svg:not([class*='size-'])]` guard stand down.
      */}
      <Glyph className="size-6" strokeWidth={2.25} aria-hidden="true" />
    </Button>
  )
}
