import { type ControlDensity, buttonSizeForDensity } from '../system/density'

/**
 * Fluent 2 size names mapped onto Kro density and Button sizes.
 *
 * Fluent says small / medium / large. Kro says compact / comfortable, with
 * `lg` as the 44px floor. The mapping is named so a Fluent story never
 * invents a third scale.
 */

export type FluentControlSize = 'small' | 'medium' | 'large'

export const FLUENT_CONTROL_SIZES: readonly FluentControlSize[] = [
  'small',
  'medium',
  'large',
]

export function densityForFluentSize(size: FluentControlSize): ControlDensity {
  return size === 'small' ? 'compact' : 'comfortable'
}

export function buttonSizeForFluentSize(
  size: FluentControlSize,
): 'sm' | 'md' | 'lg' {
  if (size === 'small') return 'sm'
  if (size === 'large') return 'lg'
  return 'md'
}

export function fluentSizeForDensity(
  density: ControlDensity,
): Exclude<FluentControlSize, 'large'> {
  return density === 'compact' ? 'small' : 'medium'
}

export { buttonSizeForDensity }
