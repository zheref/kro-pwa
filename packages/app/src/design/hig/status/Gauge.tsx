import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

function clampUnitInterval(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Gauge — HIG "Gauges", painted with KroTokens.
 *
 * A 270° arc on a 0–1 scale. The percentage in the bowl and the caption
 * beneath it are the accessible name, so the accent stroke is never the
 * only signal. Track and fill read `hairline` and `accent` — the live
 * tint, not a hardcoded paint.
 */

export interface GaugeProps {
  /** Position on a 0–1 scale. */
  readonly value: number
  /** The figure drawn in the bowl, e.g. "72%". */
  readonly label: string
  /** What the figure measures, e.g. "Daily focus". */
  readonly caption?: string
  readonly className?: string
  readonly density?: ControlDensity
}

const SIZE = 128
const STROKE = 10
const CENTRE = SIZE / 2
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const ARC_FRACTION = 270 / 360
const TRACK_LENGTH = CIRCUMFERENCE * ARC_FRACTION

export function gaugeAccessibleName(label: string, caption?: string): string {
  return caption === undefined ? label : `${caption}, ${label}`
}

export function Gauge({
  value,
  label,
  caption,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: GaugeProps) {
  const clamped = clampUnitInterval(value)
  const fillLength = TRACK_LENGTH * clamped
  const name = gaugeAccessibleName(label, caption)

  return (
    <div
      data-slot="gauge"
      data-density={density}
      className={cn(
        'inline-flex flex-col items-center gap-kro-small',
        className,
      )}
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          role="img"
          aria-label={name}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block"
        >
          <circle
            cx={CENTRE}
            cy={CENTRE}
            r={RADIUS}
            fill="none"
            stroke="var(--kro-color-hairline)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${TRACK_LENGTH} ${CIRCUMFERENCE}`}
            transform={`rotate(135 ${CENTRE} ${CENTRE})`}
          />
          <circle
            cx={CENTRE}
            cy={CENTRE}
            r={RADIUS}
            fill="none"
            stroke="var(--kro-color-accent)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${fillLength} ${CIRCUMFERENCE}`}
            transform={`rotate(135 ${CENTRE} ${CENTRE})`}
          />
        </svg>
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center font-semibold text-kro-fore',
            DENSITY_TYPE[density],
          )}
        >
          {label}
        </span>
      </div>
      {caption === undefined ? null : (
        <span className={cn(DENSITY_TYPE[density], 'text-kro-fore-secondary')}>
          {caption}
        </span>
      )}
    </div>
  )
}
