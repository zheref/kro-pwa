import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Chart — HIG "Charts", painted with KroTokens.
 *
 * A small comparison, not a graphing library. Each value is a row: a name,
 * a recessed track, a fill whose width is the share of the largest value,
 * and the number itself. Colour is never the only signal — the spoken name
 * states every figure, and the figure is on screen as text.
 *
 * Tones map to the endeavor-kind roles so a week of Focus / Habits / Events
 * reads the way the rest of Kro does. No package is added for this.
 */

export type ChartTone = 'accent' | 'kind-task' | 'kind-habit' | 'kind-event'

export interface ChartValue {
  readonly label: string
  readonly value: number
  readonly tone?: ChartTone
}

export interface ChartProps {
  readonly values: readonly ChartValue[]
  readonly unit?: string
  readonly className?: string
  readonly density?: ControlDensity
}

const TONE_FILL: Record<ChartTone, string> = {
  accent: 'bg-kro-accent',
  'kind-task': 'bg-kro-kind-task',
  'kind-habit': 'bg-kro-kind-habit',
  'kind-event': 'bg-kro-kind-event',
}

function finiteValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function chartSpokenName(
  values: readonly ChartValue[],
  unit?: string,
): string {
  return values
    .map((row) => {
      const amount = finiteValue(row.value)
      return unit === undefined
        ? `${row.label} ${amount}`
        : `${row.label} ${amount} ${unit}`
    })
    .join(', ')
}

export function Chart({
  values,
  unit,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: ChartProps) {
  const ceiling = values.reduce(
    (highest, row) => Math.max(highest, finiteValue(row.value)),
    0,
  )
  const spoken = chartSpokenName(values, unit)

  return (
    <div
      role="img"
      aria-label={spoken}
      data-slot="chart"
      data-density={density}
      className={cn('flex w-full flex-col gap-kro-small', className)}
    >
      <ul
        className="m-0 flex list-none flex-col gap-kro-small p-0"
        aria-hidden="true"
      >
        {values.map((row) => {
          const amount = finiteValue(row.value)
          const pct = ceiling === 0 ? 0 : (amount / ceiling) * 100
          const tone = row.tone ?? 'accent'
          return (
            <li
              key={row.label}
              className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-kro-small text-kro-fore"
            >
              <span className={cn('truncate', DENSITY_TYPE[density])}>
                {row.label}
              </span>
              <div className="h-2 overflow-hidden rounded-kro-pill bg-kro-back-inner">
                <div
                  className={cn('h-full rounded-kro-pill', TONE_FILL[tone])}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className={cn(
                  'tabular-nums text-kro-fore',
                  DENSITY_TYPE[density],
                )}
              >
                {amount}
                {unit === undefined ? null : ` ${unit}`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
