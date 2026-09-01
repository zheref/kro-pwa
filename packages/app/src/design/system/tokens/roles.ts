/**
 * The typed surface over `tokens.css`.
 *
 * Feature code names a role — `colorVar('badgeBlue')` — and never types a hex
 * literal or a raw custom-property string. The maps below are the only place
 * a token name is spelled in TypeScript, and `roles.test.ts` asserts that this
 * list and the stylesheet are exactly the same set in both directions: add a
 * token to one and the suite tells you about the other.
 */

/**
 * Base palette roles — the 46 colour values ported from KroApple's asset
 * catalogue, plus the derived hairline/accent pair.
 */
export const COLOR_ROLE_VARS = {
  // Surfaces
  back: '--kro-color-back',
  backInner: '--kro-color-back-inner',
  backNext: '--kro-color-back-next',
  absolute: '--kro-color-absolute',
  total: '--kro-color-total',
  // Foregrounds
  fore: '--kro-color-fore',
  foreSecondary: '--kro-color-fore-secondary',
  // Neutral scale
  snow: '--kro-color-snow',
  eggshell: '--kro-color-eggshell',
  mist: '--kro-color-mist',
  smoke: '--kro-color-smoke',
  scotchMist: '--kro-color-scotch-mist',
  athensGray: '--kro-color-athens-gray',
  payneGray: '--kro-color-payne-gray',
  charcoal: '--kro-color-charcoal',
  // Brand
  kro: '--kro-color-kro',
  kroRed: '--kro-color-kro-red',
  cozyBlue: '--kro-color-cozy-blue',
  celeste: '--kro-color-celeste',
  melon: '--kro-color-melon',
  completeBlue: '--kro-color-complete-blue',
  // Session states
  focusGreen: '--kro-color-focus-green',
  breakBeige: '--kro-color-break-beige',
  pastryGreen: '--kro-color-pastry-green',
  // Badge fills
  badgeBlue: '--kro-color-badge-blue',
  badgeRed: '--kro-color-badge-red',
  badgeGreen: '--kro-color-badge-green',
  badgeOrange: '--kro-color-badge-orange',
  badgeIndigo: '--kro-color-badge-indigo',
  badgePurple: '--kro-color-badge-purple',
  badgeTeal: '--kro-color-badge-teal',
  badgeNeutral: '--kro-color-badge-neutral',
  badgeCyan: '--kro-color-badge-cyan',
  badgePink: '--kro-color-badge-pink',
  badgeMint: '--kro-color-badge-mint',
  // Banners
  bannerWarning: '--kro-color-banner-warning',
  bannerDanger: '--kro-color-banner-danger',
  // My Day header
  headerDate: '--kro-color-header-date',
  headerGradientIndigo: '--kro-color-header-gradient-indigo',
  headerGradientGrape: '--kro-color-header-gradient-grape',
  // Rings, rewards, timeline
  ringGold: '--kro-color-ring-gold',
  ringEmerald: '--kro-color-ring-emerald',
  rewardYellow: '--kro-color-reward-yellow',
  glowLime: '--kro-color-glow-lime',
  timelineTodayForeground: '--kro-color-timeline-today-foreground',
  timelineTodaySelectedForeground:
    '--kro-color-timeline-today-selected-foreground',
  timelineSelectionOutline: '--kro-color-timeline-selection-outline',
  // Accent + derived
  accent: '--kro-color-accent',
  onAccent: '--kro-color-on-accent',
  hairline: '--kro-color-hairline',
} as const

export type ColorRole = keyof typeof COLOR_ROLE_VARS

/**
 * Semantic roles — KroTokens.Colors one-for-one. "What colour is a Habit" has
 * exactly one answer, and re-tuning it happens here, not at a call site.
 */
export const SEMANTIC_ROLE_VARS = {
  kindTask: '--kro-role-kind-task',
  kindEvent: '--kro-role-kind-event',
  kindHabit: '--kro-role-kind-habit',
  kindReminder: '--kro-role-kind-reminder',
  kindBehavior: '--kro-role-kind-behavior',
  kindBlueprint: '--kro-role-kind-blueprint',
  kindBackground: '--kro-role-kind-background',
  hostSupabase: '--kro-role-host-supabase',
  hostLocal: '--kro-role-host-local',
  hostAppleCalendar: '--kro-role-host-apple-calendar',
  hostAppleReminders: '--kro-role-host-apple-reminders',
  hostGoogleCalendar: '--kro-role-host-google-calendar',
  hostOutlookCalendar: '--kro-role-host-outlook-calendar',
  chipNeutral: '--kro-role-chip-neutral',
  statusPending: '--kro-role-status-pending',
  statusPlanned: '--kro-role-status-planned',
  statusOngoing: '--kro-role-status-ongoing',
  statusPaused: '--kro-role-status-paused',
  statusReviewing: '--kro-role-status-reviewing',
  statusDelegated: '--kro-role-status-delegated',
  statusQA: '--kro-role-status-qa',
  statusBlocked: '--kro-role-status-blocked',
} as const

export type SemanticRole = keyof typeof SEMANTIC_ROLE_VARS

/** The 4pt rhythm — KroTokens.Spacing. */
export const SPACING_VARS = {
  tiny: '--kro-space-tiny',
  small: '--kro-space-small',
  medium: '--kro-space-medium',
  large: '--kro-space-large',
  xLarge: '--kro-space-x-large',
  xxLarge: '--kro-space-xx-large',
} as const

export type SpacingRole = keyof typeof SPACING_VARS

/** KroTokens.Radius. `pill` is SwiftUI's `.infinity`, expressed as a capsule. */
export const RADIUS_VARS = {
  small: '--kro-radius-small',
  field: '--kro-radius-field',
  card: '--kro-radius-card',
  surface: '--kro-radius-surface',
  large: '--kro-radius-large',
  pill: '--kro-radius-pill',
} as const

export type RadiusRole = keyof typeof RADIUS_VARS

/** KroTokens.Shadow. */
export const SHADOW_VARS = {
  subtle: '--kro-shadow-subtle',
  card: '--kro-shadow-card',
  surface: '--kro-shadow-surface',
} as const

export type ShadowRole = keyof typeof SHADOW_VARS

/** KroTokens.Size. `minPointerTarget` is the web/desktop half of the idiom rule. */
export const SIZE_VARS = {
  minTouchTarget: '--kro-size-min-touch-target',
  minPointerTarget: '--kro-size-min-pointer-target',
  fieldMinHeight: '--kro-size-field-min-height',
  rowIconColumn: '--kro-size-row-icon-column',
} as const

export type SizeRole = keyof typeof SIZE_VARS

/**
 * The single disabled fade. Apply it exactly once per control — see the note
 * at the declaration in `tokens.css`.
 */
export const DISABLED_OPACITY_VAR = '--kro-opacity-disabled'
export const DISABLED_OPACITY = 0.62

/** `var(--kro-color-…)`, ready for a `style` prop or a CSS value. */
export function colorVar(role: ColorRole): string {
  return `var(${COLOR_ROLE_VARS[role]})`
}

/** `var(--kro-role-…)` for a semantic role. */
export function semanticVar(role: SemanticRole): string {
  return `var(${SEMANTIC_ROLE_VARS[role]})`
}

/** `var(--kro-space-…)`. */
export function spacingVar(role: SpacingRole): string {
  return `var(${SPACING_VARS[role]})`
}

/** `var(--kro-radius-…)`. */
export function radiusVar(role: RadiusRole): string {
  return `var(${RADIUS_VARS[role]})`
}

/** `var(--kro-shadow-…)`. */
export function shadowVar(role: ShadowRole): string {
  return `var(${SHADOW_VARS[role]})`
}

export const COLOR_ROLES = Object.keys(COLOR_ROLE_VARS) as ColorRole[]
export const SEMANTIC_ROLES = Object.keys(SEMANTIC_ROLE_VARS) as SemanticRole[]
