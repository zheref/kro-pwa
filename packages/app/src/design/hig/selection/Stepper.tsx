import { useCallback, useId, useState } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_BOX,
  iconButtonSizeForDensity,
} from '../../system/density'
import { Button } from '../../system/primitives/button'
import { cn } from '../../system/utils/cn'

/**
 * Stepper — HIG "Steppers", painted with KroTokens.
 *
 * A slider is the wrong control when the value is discrete and the person
 * is nudging it one tick at a time (session minutes, reward points). Two
 * 44px buttons keep each hit at the touch floor; the readout in the middle
 * is not a field, so it does not steal focus from the steppers.
 *
 * Each Button already applies the disabled fade once. Wrapping the pair in
 * another opacity would multiply the two and drop the glyph below the 3:1
 * floor. Minus disables at `min`, plus at `max` — the bound is the signal,
 * not a colour change.
 */

export interface StepperProps {
  readonly value?: number
  readonly defaultValue?: number
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly onValueChange?: (value: number) => void
  readonly label?: string
  readonly disabled?: boolean
  readonly id?: string
  readonly className?: string
  readonly density?: ControlDensity
}

export function Stepper({
  value,
  defaultValue = 0,
  min,
  max,
  step = 1,
  onValueChange,
  label,
  disabled,
  id,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: StepperProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const current = isControlled ? value : uncontrolled

  const userDidStep = useCallback(
    (delta: number) => {
      const raw = current + delta
      const floored = min === undefined ? raw : Math.max(min, raw)
      const next = max === undefined ? floored : Math.min(max, floored)
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [current, isControlled, max, min, onValueChange],
  )

  const atMin = min !== undefined && current <= min
  const atMax = max !== undefined && current >= max

  const control = (
    <div
      id={controlId}
      role="group"
      aria-labelledby={label !== undefined ? `${controlId}-label` : undefined}
      data-slot="stepper"
      data-density={density}
      className={cn(
        'inline-flex items-center gap-kro-small text-kro-fore',
        className,
      )}
    >
      <Button
        variant="secondary"
        size={iconButtonSizeForDensity(density)}
        aria-label="Decrease"
        disabled={disabled || atMin}
        onClick={() => {
          userDidStep(-step)
        }}
      >
        −
      </Button>
      <span
        aria-live="polite"
        className={cn(DENSITY_BOX[density], 'text-center tabular-nums')}
      >
        {current}
      </span>
      <Button
        variant="secondary"
        size={iconButtonSizeForDensity(density)}
        aria-label="Increase"
        disabled={disabled || atMax}
        onClick={() => {
          userDidStep(step)
        }}
      >
        +
      </Button>
    </div>
  )

  if (label === undefined) return control

  return (
    <div className="inline-flex items-center gap-kro-small text-kro-fore">
      <span id={`${controlId}-label`}>{label}</span>
      {control}
    </div>
  )
}
