/**
 * Fluent 2 Spinner, painted with KroTokens.
 *
 * Reuses the `kro-hig-spinner` recipe. The visible label (and
 * `aria-valuetext`) is the non-colour signal — inverted paint is only for
 * sitting on accent glass, never a substitute for words.
 */

import type { CSSProperties } from 'react'
import { colorVar } from '../../system/tokens/roles'
import { cn } from '../../system/utils/cn'

export type SpinnerAppearance = 'primary' | 'inverted'
export type SpinnerSize =
  | 'tiny'
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'extra-large'
  | 'huge'
export type SpinnerLabelPosition = 'before' | 'after' | 'above' | 'below'

export const SPINNER_PX: Record<SpinnerSize, number> = {
  tiny: 16,
  'extra-small': 20,
  small: 24,
  medium: 28,
  large: 32,
  'extra-large': 36,
  huge: 48,
}

export const SPINNER_SIZES: readonly SpinnerSize[] = [
  'tiny',
  'extra-small',
  'small',
  'medium',
  'large',
  'extra-large',
  'huge',
]

function spinnerBorder(size: SpinnerSize): number {
  const px = SPINNER_PX[size]
  if (px <= 20) return 2
  if (px <= 32) return 3
  return 4
}

export interface SpinnerProps {
  readonly appearance?: SpinnerAppearance
  readonly size?: SpinnerSize
  readonly label?: string
  readonly labelPosition?: SpinnerLabelPosition
  readonly className?: string
}

export function Spinner({
  appearance = 'primary',
  size = 'medium',
  label,
  labelPosition = 'after',
  className,
}: SpinnerProps) {
  const px = SPINNER_PX[size]
  const inverted = appearance === 'inverted'
  const labelFirst = labelPosition === 'before' || labelPosition === 'above'
  const stacked = labelPosition === 'above' || labelPosition === 'below'
  const spoken = label ?? 'Loading'
  const ink = inverted ? colorVar('onAccent') : colorVar('fore')

  const onAccent = colorVar('onAccent')
  const invertedFace: CSSProperties | undefined = inverted
    ? {
        borderColor: `color-mix(in srgb, ${onAccent} 18%, transparent)`,
        borderTopColor: onAccent,
      }
    : undefined

  const face = (
    <span
      className="kro-hig-spinner"
      style={{
        width: px,
        height: px,
        borderWidth: spinnerBorder(size),
        ...invertedFace,
      }}
    />
  )

  const caption =
    label === undefined ? null : (
      <span className="text-xs font-medium">{label}</span>
    )

  return (
    <div
      role="progressbar"
      aria-valuetext={spoken}
      data-slot="spinner"
      data-appearance={appearance}
      data-size={size}
      data-label-position={labelPosition}
      className={cn(
        'inline-flex gap-2',
        stacked ? 'flex-col items-center' : 'flex-row items-center',
        className,
      )}
      style={{ color: ink }}
    >
      {labelFirst ? (
        <>
          {caption}
          {face}
        </>
      ) : (
        <>
          {face}
          {caption}
        </>
      )}
    </div>
  )
}
