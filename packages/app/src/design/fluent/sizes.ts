import { type ControlDensity, buttonSizeForDensity } from '../system/density'

/**
 * Fluent 2 size names mapped onto Kro density and Button sizes.
 *
 * Desktop-compact is the default: Fluent `small` and `medium` both paint
 * compact (`sm`). `large` is the comfortable / touch preview (`md`).
 * Button `lg` (the 44px floor) stays opt-in and is not this mapping.
 */

export type FluentControlSize = 'small' | 'medium' | 'large'

export const FLUENT_CONTROL_SIZES: readonly FluentControlSize[] = [
  'small',
  'medium',
  'large',
]

export function densityForFluentSize(size: FluentControlSize): ControlDensity {
  return size === 'large' ? 'comfortable' : 'compact'
}

export function buttonSizeForFluentSize(
  size: FluentControlSize,
): 'sm' | 'md' | 'lg' {
  if (size === 'large') return 'md'
  return 'sm'
}

export function fluentSizeForDensity(
  density: ControlDensity,
): FluentControlSize {
  return density === 'compact' ? 'small' : 'large'
}

export { buttonSizeForDensity }
