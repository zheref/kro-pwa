import { type ReactNode, useId } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * ProgressIndicator — HIG "Progress indicators", painted with KroTokens.
 *
 * `value` is a unit interval, 0–1. A caller that has "72 of 100" divides
 * first; this control does not guess whether 72 meant percent or a raw
 * count. The visible `label` (and `aria-valuenow` / `aria-valuetext`) is
 * the non-colour signal.
 *
 * Determinate kinds expose min/max/now. The indeterminate spinner uses
 * the `kro-hig-spinner` recipe in `hig.css` and speaks "Loading" — it has
 * no valuemin because there is no range to announce.
 */

export type ProgressIndicatorKind = 'bar' | 'circular' | 'indeterminate'
export type ProgressIndicatorSize = 'sm' | 'md'

export interface ProgressIndicatorProps {
  readonly kind: ProgressIndicatorKind
  /** Completion on a 0–1 scale. Ignored when `kind` is `indeterminate`. */
  readonly value?: number
  readonly label?: string
  readonly size?: ProgressIndicatorSize
  readonly density?: ControlDensity
  readonly className?: string
}

export function clampUnitInterval(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

const CIRCULAR_PX: Record<ProgressIndicatorSize, number> = {
  sm: 28,
  md: 36,
}

const CIRCULAR_STROKE = 3

function Bar({
  value,
  labelledBy,
  density,
  className,
}: {
  readonly value: number
  readonly labelledBy?: string
  readonly density: ControlDensity
  readonly className?: string
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={value}
      aria-labelledby={labelledBy}
      data-slot="progress-bar"
      data-density={density}
      className={cn(
        'h-2 w-full overflow-hidden rounded-kro-pill bg-kro-back-inner',
        className,
      )}
    >
      <div
        className="h-full rounded-kro-pill bg-kro-accent"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  )
}

function Circular({
  value,
  size,
  labelledBy,
  density,
  className,
}: {
  readonly value: number
  readonly size: ProgressIndicatorSize
  readonly labelledBy?: string
  readonly density: ControlDensity
  readonly className?: string
}) {
  const px = CIRCULAR_PX[size]
  const radius = (px - CIRCULAR_STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const centre = px / 2

  return (
    <svg
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={value}
      aria-labelledby={labelledBy}
      data-slot="progress-circular"
      data-density={density}
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      className={className}
    >
      <circle
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        stroke="var(--kro-color-hairline)"
        strokeWidth={CIRCULAR_STROKE}
      />
      <circle
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        stroke="var(--kro-color-accent)"
        strokeWidth={CIRCULAR_STROKE}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
        transform={`rotate(-90 ${centre} ${centre})`}
      />
    </svg>
  )
}

function Indeterminate({
  size,
  labelledBy,
  density,
  className,
}: {
  readonly size: ProgressIndicatorSize
  readonly labelledBy?: string
  readonly density: ControlDensity
  readonly className?: string
}) {
  return (
    <div
      role="progressbar"
      aria-valuetext="Loading"
      aria-labelledby={labelledBy}
      data-slot="progress-indeterminate"
      data-density={density}
      className={cn(
        'kro-hig-spinner',
        size === 'sm' ? 'size-4 border-2' : 'size-6 border-[3px]',
        className,
      )}
    />
  )
}

function sizeForDensity(density: ControlDensity): ProgressIndicatorSize {
  return density === 'compact' ? 'sm' : 'md'
}

export function ProgressIndicator({
  kind,
  value = 0,
  label,
  density = DEFAULT_CONTROL_DENSITY,
  size,
  className,
}: ProgressIndicatorProps) {
  const labelId = useId()
  const clamped = clampUnitInterval(value)
  const labelledBy = label === undefined ? undefined : labelId
  const resolvedSize = size ?? sizeForDensity(density)

  let indicator: ReactNode
  if (kind === 'bar') {
    indicator = (
      <Bar
        value={clamped}
        labelledBy={labelledBy}
        density={density}
        className={className}
      />
    )
  } else if (kind === 'circular') {
    indicator = (
      <Circular
        value={clamped}
        size={resolvedSize}
        labelledBy={labelledBy}
        density={density}
        className={className}
      />
    )
  } else {
    indicator = (
      <Indeterminate
        size={resolvedSize}
        labelledBy={labelledBy}
        density={density}
        className={className}
      />
    )
  }

  if (label === undefined) return indicator

  return (
    <div
      data-slot="progress-indicator"
      data-density={density}
      className="inline-flex items-center gap-kro-small text-kro-fore"
    >
      {indicator}
      <span id={labelId} className={DENSITY_TYPE[density]}>
        {label}
      </span>
    </div>
  )
}
