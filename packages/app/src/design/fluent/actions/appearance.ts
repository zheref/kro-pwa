/**
 * Fluent 2 button appearances, mapped 1:1 onto Button `variant`.
 *
 * The names are Fluent's. The paint is KroTokens / KroGlass — never the
 * Fluent brand ramp.
 */

export type FluentButtonAppearance =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'subtle'
  | 'transparent'

export const FLUENT_BUTTON_APPEARANCES: readonly FluentButtonAppearance[] = [
  'primary',
  'secondary',
  'outline',
  'subtle',
  'transparent',
]
