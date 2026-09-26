/**
 * Compact vs comfortable — one density for every control.
 *
 * Compact is the default: desktop chrome, pointer-first, slightly tighter
 * than Apple's 28px compact control. Comfortable is the mobile / touch
 * preview — larger than compact, still short of the 44px iOS floor, which
 * remains available as Button `lg` when a surface truly needs it.
 *
 * Surfaces that already know the pointer kind pass
 * `controlDensity(layout.isTouchPrimary)`. A design-kit component never
 * has to know a shell exists.
 */

export type ControlDensity = 'compact' | 'comfortable'

export const DEFAULT_CONTROL_DENSITY: ControlDensity = 'compact'

export function controlDensity(isTouchPrimary: boolean): ControlDensity {
  return isTouchPrimary ? 'comfortable' : 'compact'
}

export function buttonSizeForDensity(density: ControlDensity): 'sm' | 'md' {
  return density === 'compact' ? 'sm' : 'md'
}

export function iconButtonSizeForDensity(
  density: ControlDensity,
): 'icon-sm' | 'icon' {
  return density === 'compact' ? 'icon-sm' : 'icon'
}

/** The CSS length a control of this density must not fall below. */
export function controlMinSizeVar(density: ControlDensity): string {
  return density === 'compact'
    ? 'var(--kro-size-min-pointer-target)'
    : 'var(--kro-size-min-touch-target)'
}

/** Square hit area (checkbox, radio, icon well). Visual chrome aligned to Button `sm`/`md`, not the 28/44 a11y floor. */
export const DENSITY_HIT: Record<ControlDensity, string> = {
  compact: 'min-h-6 min-w-6',
  comfortable: 'min-h-9 min-w-9',
}

/** Full-width row (list, sidebar, nav). */
export const DENSITY_ROW: Record<ControlDensity, string> = {
  compact: 'min-h-6 text-xs',
  comfortable: 'min-h-9 text-sm',
}

/** Square box (digit cell, color well). */
export const DENSITY_BOX: Record<ControlDensity, string> = {
  compact: 'size-6',
  comfortable: 'size-9',
}

/** Field / control height. */
export const DENSITY_FIELD: Record<ControlDensity, string> = {
  compact: 'h-6 text-xs',
  comfortable: 'h-9 text-sm',
}

/** Body type that sits next to a control. */
export const DENSITY_TYPE: Record<ControlDensity, string> = {
  compact: 'text-xs',
  comfortable: 'text-sm',
}

export function isComfortable(density: ControlDensity): boolean {
  return density === 'comfortable'
}

/**
 * The corner of a selectable control at each density — the standard for
 * segmented controls, filter and preset pills. Compact (desktop) controls take
 * the menu-row radius every compact Button already uses (`--kro-radius-small`,
 * 8px); comfortable (touch) controls stay capsules.
 */
export const CONTROL_RADIUS: Record<ControlDensity, string> = {
  compact: 'var(--kro-radius-small)',
  comfortable: 'var(--kro-radius-pill)',
}

/**
 * The fill of a SELECTED segment or pill: the foreground colour itself, with
 * the background colour for its label — so it is white on dark and black on
 * light, inverting with the scheme rather than washing the same pale glass in
 * both. The standard for segmented controls and filter/preset pills.
 */
export const SELECTED_CONTROL_STYLE = {
  background: 'var(--kro-color-fore)',
  color: 'var(--kro-color-back)',
} as const
