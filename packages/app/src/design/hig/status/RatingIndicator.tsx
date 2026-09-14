import { Star } from 'lucide-react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_BOX,
  DENSITY_TYPE,
  iconButtonSizeForDensity,
} from '../../system/density'
import { Button } from '../../system/primitives/button'
import { cn } from '../../system/utils/cn'

/**
 * RatingIndicator — HIG "Rating indicators", painted with KroTokens.
 *
 * Five stars, never colour alone: the numeric "N of 5" sits beside them,
 * and each star names its own rank. Filled stars take the reward yellow
 * (or the live accent) and a solid fill; empty stars are secondary.
 *
 * Interactive targets are the 44px touch floor. A read-only rating is
 * not a cluster of disabled buttons — it is an image, so the fade is
 * not applied five times over.
 */

export const RATING_MAX = 5

export interface RatingIndicatorProps {
  readonly value: number
  readonly onValueChange?: (value: number) => void
  readonly readOnly?: boolean
  readonly label: string
  readonly className?: string
  readonly density?: ControlDensity
}

function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(RATING_MAX, Math.max(0, Math.round(value)))
}

function StarGlyph({ filled }: { readonly filled: boolean }) {
  return (
    <Star
      aria-hidden="true"
      className={cn(
        'size-5',
        filled ? 'text-kro-reward-yellow' : 'text-kro-fore-secondary',
      )}
      fill={filled ? 'currentColor' : 'none'}
    />
  )
}

export function RatingIndicator({
  value,
  onValueChange,
  readOnly = false,
  label,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: RatingIndicatorProps) {
  const current = clampRating(value)
  const count = `(${current} of ${RATING_MAX})`

  if (readOnly) {
    return (
      <div
        role="img"
        aria-label={`${label}: ${current} of ${RATING_MAX}`}
        data-slot="rating-indicator"
        data-density={density}
        className={cn(
          'inline-flex items-center gap-kro-tiny text-kro-fore',
          className,
        )}
      >
        {Array.from({ length: RATING_MAX }, (_, index) => {
          const n = index + 1
          return (
            <span
              key={n}
              aria-hidden="true"
              className={cn(
                'inline-flex items-center justify-center',
                DENSITY_BOX[density],
              )}
            >
              <StarGlyph filled={n <= current} />
            </span>
          )
        })}
        <span className={cn(DENSITY_TYPE[density], 'text-kro-fore-secondary')}>
          {count}
        </span>
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="rating-indicator"
      data-density={density}
      className={cn(
        'inline-flex items-center gap-kro-tiny text-kro-fore',
        className,
      )}
    >
      <span className="sr-only">
        {current} of {RATING_MAX}
      </span>
      {Array.from({ length: RATING_MAX }, (_, index) => {
        const n = index + 1
        const filled = n <= current
        return (
          <Button
            key={n}
            type="button"
            variant="ghost"
            size={iconButtonSizeForDensity(density)}
            aria-label={`${n} of ${RATING_MAX}`}
            aria-pressed={filled}
            onClick={() => onValueChange?.(n)}
          >
            <StarGlyph filled={filled} />
          </Button>
        )
      })}
      <span
        aria-hidden="true"
        className={cn(DENSITY_TYPE[density], 'text-kro-fore-secondary')}
      >
        {count}
      </span>
    </div>
  )
}
