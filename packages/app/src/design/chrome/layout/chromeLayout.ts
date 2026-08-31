/**
 * The bottom-chrome geometry, in one place.
 *
 * KroApple keeps these numbers as private `static let`s on `MainScreen`
 * (`Kro/Application/Main/MainScreen.swift`) because the FAB, the Session Pill
 * and the Active Toast have to agree on where the bottom-right corner of the
 * screen is. Three views reading three copies of "62" is how a pill ends up
 * 8pt below the button it is supposed to share a baseline with.
 *
 * The same reason applies here, and one more: `#22` owns the Session Pill and
 * `#13` owns the shell, so the toast in this kit and the pill in that one must
 * derive their offsets from the SAME constants or they will drift the first
 * time either is nudged. Hence a module, not literals at call sites.
 *
 * CANON PIN. Values below are `zheref/KroApple@9d1e395` (`origin/main` at the
 * time of the port). The epic pins `@2c1ee45`; the constants themselves are
 * unchanged between the two — see the PR's canon-constant table.
 *
 * WHAT IS NOT HERE. Anything that is already a design token — spacing, radius,
 * touch targets — is read from `tokens.css`, never restated. These are the
 * numbers canon chose that the token scale has no name for.
 */

/**
 * The two FAB insets KroApple ships, kept as named variants rather than
 * collapsed into one.
 *
 * They are not a refactor waiting to happen: iOS 26's `Tab` API draws its own
 * Liquid Glass tab bar with different metrics, so `MainScreen` genuinely uses
 * `12 / 53` there and `16 / 60` on the legacy `TabView` path. The web has one
 * tab bar, but which of the two it should match is the shell child's (`#13`)
 * decision, not this kit's — so both survive the port and the caller names one.
 */
export const FAB_INSETS = {
  /**
   * `MainScreen.ios26PhoneBody` — `.padding(.trailing, 12).padding(.bottom, 53)`.
   * The bottom inset is smaller because iOS 26's tab bar is taller.
   */
  modern: { trailing: 12, bottom: 53 },
  /**
   * `MainScreen.legacyPhoneBody` — `.padding(.trailing, 16).padding(.bottom, 60)`.
   * Also the values `MainScreen.fabTrailingPadding` / `fabBottomPadding` hold,
   * which is what the pill's own offset is computed from.
   */
  legacy: { trailing: 16, bottom: 60 },
} as const

export type FabInsetVariant = keyof typeof FAB_INSETS

export const CHROME_LAYOUT = {
  /** `LiquidGlassFAB.size` — the disc's diameter. */
  fabDiameter: 62,

  /**
   * `LiquidGlassFAB.hitAreaInset` — transparent padding canon adds around the
   * disc to widen the tap target, and therefore how far the drawn edge sits
   * inside the button's layout bounds.
   *
   * The web port draws the disc at its layout size and passes 0 to the glow,
   * because 62px already clears both the 44px touch floor and the 28px pointer
   * floor without help. Kept here because `RotatingGlow` still takes an `inset`
   * and a caller that DOES pad itself needs canon's number to hand it.
   */
  fabHitAreaInset: 8,

  /** `MainScreen.fabTrailingPadding` — what the pill's trailing offset uses. */
  fabTrailingPadding: 12,
  /** `MainScreen.fabBottomPadding`. */
  fabBottomPadding: 60,

  /** `MainScreen.pillHeight` — matches the FAB so the two share a baseline. */
  pillHeight: 62,
  /**
   * `MainScreen.pillBottomPadding` — 1pt above the FAB's own bottom inset,
   * because the pill's glass reads optically lower at identical paddings.
   */
  pillBottomPadding: 61,
  /** `MainScreen.pillLeadingPadding` — keeps the title off a narrow screen edge. */
  pillLeadingPadding: 20,
  /** `MainScreen.pillToastSpacing` — pill↔FAB, and toast↔pill when both show. */
  pillToastSpacing: 15,

  /** `ActiveToastModifier.trailingPadding` — clears the FAB. */
  toastTrailingPadding: 96,
  /** `ActiveToastModifier` — `.padding(.leading, 16)`. */
  toastLeadingPadding: 16,
  /** `ActiveToastModifier` — `.padding(.bottom, 24)`; the lift is derived from it. */
  toastBottomPadding: 24,
  /**
   * `ActiveToastModifier.verticalOffset` — raises the toast onto the FAB's
   * vertical centre given the 24pt bottom padding above.
   */
  toastVerticalOffset: 15,

  /** `docs/Features/ActiveToast.md` — "Minimum 72pt height, adapts to content". */
  toastMinHeight: 72,
  /**
   * `docs/Features/ActiveToast.md` — "typically 350–360pt wide".
   *
   * A MAXIMUM here, not a fixed width. Canon sizes the toast by its insets
   * (leading 16, trailing 96) and lets it fill what is left, which on a 393px
   * phone is 281px — a hard 350px floor would overflow the viewport it is
   * meant to sit inside. The cap keeps the documented upper end on the wide
   * layouts where canon actually reaches it.
   */
  toastMaxWidth: 360,
  /**
   * `docs/Features/ActiveToast.md` — "Rounded rectangle with 16pt continuous
   * corner radius". Not `--kro-radius-surface` (20px): this is canon's number
   * for this one surface, and the token scale has no 16px step.
   */
  toastCornerRadius: 16,
  /** `docs/Features/ActiveToast.md` — "18pt horizontal, 16pt vertical". */
  toastPaddingX: 18,
  toastPaddingY: 16,
} as const

/**
 * How far the toast must rise to clear the Session Pill entirely.
 *
 * Derived, exactly as `MainScreen.toastLiftAbovePill` is, so nudging any one
 * of the four inputs moves the toast with it instead of leaving a literal
 * behind that nobody remembers to update.
 */
export function toastLiftAbovePill(): number {
  return (
    CHROME_LAYOUT.pillBottomPadding +
    CHROME_LAYOUT.pillHeight +
    CHROME_LAYOUT.pillToastSpacing -
    CHROME_LAYOUT.toastBottomPadding
  )
}

/**
 * The pill's trailing inset — `fabTrailingPadding + fabDiameter +
 * pillToastSpacing`, per `MainScreen.sessionPillOverlay`.
 *
 * Exported for `#22`, which owns the pill itself: the number belongs with the
 * constants it is computed from, not in the feature that happens to render it.
 */
export function pillTrailingPadding(): number {
  return (
    CHROME_LAYOUT.fabTrailingPadding +
    CHROME_LAYOUT.fabDiameter +
    CHROME_LAYOUT.pillToastSpacing
  )
}

/**
 * Auto-dismiss bounds, in seconds.
 *
 * `docs/Features/ActiveToast.md` § Accessibility: "minimum 3 seconds for short
 * messages, up to 12 seconds for complex messages". The default is canon's own
 * `ActiveToast.duration` default.
 */
export const TOAST_DURATION_SECONDS = {
  min: 3,
  max: 12,
  default: 10,
} as const

/** Clamps a requested auto-dismiss duration into the documented reading window. */
export function clampToastDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) return TOAST_DURATION_SECONDS.default
  return Math.min(
    TOAST_DURATION_SECONDS.max,
    Math.max(TOAST_DURATION_SECONDS.min, seconds),
  )
}
