/**
 * Accent theming — the one palette role a user may re-tint at runtime.
 *
 * The rule this exists to enforce: an accent is never set on its own. The
 * label colour that sits on it has to move with it, or a light user accent
 * turns every primary button's text invisible. `applyAccentColor` writes both
 * properties together and reports the ratio it achieved, so a caller can warn
 * about a tint that cannot be made legible instead of shipping one.
 */

import { useEffect, useMemo } from 'react'
import { contrastRatio, parseColor } from './contrast'
import { COLOR_ROLE_VARS } from './roles'

/** The two properties an accent change must always write as a pair. */
export const ACCENT_VAR = COLOR_ROLE_VARS.accent
export const ON_ACCENT_VAR = COLOR_ROLE_VARS.onAccent

const WHITE = '#ffffff'
const BLACK = '#000000'

export interface AccentDecision {
  /** The accent as given. */
  readonly accent: string
  /** The label colour with the better contrast on it. */
  readonly onAccent: string
  /** The ratio `onAccent` achieves on `accent`. */
  readonly contrast: number
}

/**
 * The floor this strategy guarantees.
 *
 * Choosing the better of black and white can never do worse than 4.58:1 on an
 * opaque fill: the two ratios cross at relative luminance 0.1791, where each
 * measures 1.05/0.2291. So a user accent is always legible *provided it is
 * opaque* — which is why `decideAccent` refuses a translucent one.
 */
export const ACCENT_CONTRAST_FLOOR = 4.58

/**
 * Picks the label colour for an accent: whichever pole reads better on it.
 *
 * Deliberately limited to black and white. A third candidate would make the
 * choice look considered while still being unverifiable — the two poles are
 * what the token file declares and what the contrast suite measures.
 *
 * A translucent accent is rejected rather than measured. Its real contrast is
 * a property of whatever renders behind it, so it cannot be decided once and
 * trusted — the same reasoning that made KroApple's banner fills opaque.
 */
export function decideAccent(accent: string): AccentDecision {
  const fill = parseColor(accent)
  if (fill.a < 1) {
    throw new Error(
      `accent "${accent}" is translucent; its contrast would depend on whatever is behind it. Use an opaque colour.`,
    )
  }
  const onWhite = contrastRatio(parseColor(WHITE), fill)
  const onBlack = contrastRatio(parseColor(BLACK), fill)
  const onAccent = onWhite >= onBlack ? WHITE : BLACK
  return { accent, onAccent, contrast: Math.max(onWhite, onBlack) }
}

/**
 * Writes the accent pair onto `element` as inline custom properties and
 * returns a function that removes them again.
 *
 * Inline rather than a stylesheet edit so scoped theming works: a settings
 * preview can re-tint one subtree without touching the document.
 */
export function applyAccentColor(
  accent: string,
  element: HTMLElement,
): { decision: AccentDecision; revert: () => void } {
  const decision = decideAccent(accent)
  const previousAccent = element.style.getPropertyValue(ACCENT_VAR)
  const previousOnAccent = element.style.getPropertyValue(ON_ACCENT_VAR)

  element.style.setProperty(ACCENT_VAR, decision.accent)
  element.style.setProperty(ON_ACCENT_VAR, decision.onAccent)

  return {
    decision,
    revert: () => {
      if (previousAccent === '') element.style.removeProperty(ACCENT_VAR)
      else element.style.setProperty(ACCENT_VAR, previousAccent)
      if (previousOnAccent === '') element.style.removeProperty(ON_ACCENT_VAR)
      else element.style.setProperty(ON_ACCENT_VAR, previousOnAccent)
    },
  }
}

export interface UseAccentColorOptions {
  /** Where to write the properties. Defaults to `document.documentElement`. */
  readonly target?: HTMLElement | null
  /** Skip the write but still compute the decision — for a live preview. */
  readonly enabled?: boolean
}

/**
 * Applies `accent` for as long as the component is mounted, restoring whatever
 * was there before on unmount or when the accent changes.
 *
 * Passing `null` means "leave the default alone" and is the shape a settings
 * screen wants: the user has not chosen a tint yet.
 */
export function useAccentColor(
  accent: string | null,
  options: UseAccentColorOptions = {},
): AccentDecision | null {
  const { target = null, enabled = true } = options

  const decision = useMemo(
    () => (accent === null ? null : decideAccent(accent)),
    [accent],
  )

  useEffect(() => {
    if (decision === null || !enabled) return
    const element =
      target ??
      (typeof document === 'undefined' ? null : document.documentElement)
    if (element === null) return
    const { revert } = applyAccentColor(decision.accent, element)
    return revert
  }, [decision, enabled, target])

  return decision
}
