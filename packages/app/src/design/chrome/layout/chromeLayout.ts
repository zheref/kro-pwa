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
 * The custom property a shell publishes its bottom inset on.
 *
 * WHY THE KIT NAMES IT AND THE SHELL FILLS IT. Every number in `CHROME_LAYOUT`
 * is canon's, and canon measures them inside a tab — where SwiftUI's safe area
 * has *already* excluded the tab bar. On the web the tab bar is an ordinary
 * flex child of the shell, so the viewport's bottom edge is BELOW it and a
 * viewport-anchored toast lands underneath the bar.
 *
 * The kit cannot ask the shell how tall its bar is without importing it, so it
 * states a contract instead: publish this property and every bottom-anchored
 * chrome surface rises by it. The `0px` fallback is what keeps the kit
 * shell-agnostic — mounted with no shell around it, or on the sidebar shell
 * which has no bar at all, nothing changes.
 */
export const SHELL_BOTTOM_INSET_VAR = '--kro-shell-bottom-inset'

/** The default a bottom-anchored chrome surface reads when nobody passes one. */
export const SHELL_BOTTOM_INSET_FALLBACK = `var(${SHELL_BOTTOM_INSET_VAR}, 0px)`

/**
 * The toast's distance from the bottom edge, given the shell's inset.
 *
 * `toastBottomPadding` is canon's 24, measured inside the tab safe area; the
 * inset is what the web has to add to reach the same place.
 */
export function toastBottomOffset(bottomInset = 0): number {
  return CHROME_LAYOUT.toastBottomPadding + bottomInset
}

/**
 * The pill's distance from the bottom edge, given the same inset.
 *
 * Exported for `#22` alongside `pillTrailingPadding()`, and used here so the
 * lift below is written in terms of both surfaces rather than in terms of one
 * of them plus an assumption about the other.
 */
export function pillBottomOffset(bottomInset = 0): number {
  return CHROME_LAYOUT.pillBottomPadding + bottomInset
}

/**
 * How far the toast must rise to clear the Session Pill entirely.
 *
 * Derived, exactly as `MainScreen.toastLiftAbovePill` is, so nudging any one
 * of the four inputs moves the toast with it instead of leaving a literal
 * behind that nobody remembers to update.
 *
 * THE INSET IS A PARAMETER AND IT CANCELS — deliberately, and stated rather
 * than assumed. The lift is a distance *between two surfaces*, and a shell that
 * raises its bottom chrome raises the pill and the toast by the same amount, so
 * the gap between them is unchanged. Taking the inset as an argument is what
 * makes that a checkable property (`chromeLayout.test.ts` asserts it across a
 * range of insets) instead of an unwritten belief, and leaves exactly one place
 * to change if a future shell ever insets only one of the two.
 */
export function toastLiftAbovePill(bottomInset = 0): number {
  return (
    pillBottomOffset(bottomInset) +
    CHROME_LAYOUT.pillHeight +
    CHROME_LAYOUT.pillToastSpacing -
    toastBottomOffset(bottomInset)
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
