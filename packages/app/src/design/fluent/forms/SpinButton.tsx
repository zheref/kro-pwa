import { useCallback, useId, useState } from 'react'
import { Label } from '../../hig/layout/Label'
import { iconButtonSizeForDensity } from '../../system/density'
import { Button } from '../../system/primitives/button'
import { Input } from '../../system/primitives/input'
import { cn } from '../../system/utils/cn'
import { type FluentControlSize, densityForFluentSize } from '../sizes'

/**
 * SpinButton — Fluent 2 SpinButton, painted with KroTokens.
 *
 * Nudge a number inside a range. Unlike a HIG Stepper, the value is an
 * editable field, not a readout. Minus disables at `min`, plus at
 * `max` — the bound is the signal, not a colour change.
 *
 * Each Button and the Input apply the disabled fade once. This wrapper
 * does not add another opacity.
 */

export interface SpinButtonProps {
  readonly value?: number
  readonly defaultValue?: number
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly onValueChange?: (value: number) => void
  readonly label?: string
  readonly disabled?: boolean
  readonly size?: FluentControlSize
  readonly id?: string
  readonly className?: string
}

function clampToRange(
  next: number,
  min: number | undefined,
  max: number | undefined,
): number {
  const floored = min === undefined ? next : Math.max(min, next)
  return max === undefined ? floored : Math.min(max, floored)
}

export function SpinButton({
  value,
  defaultValue = 0,
  min,
  max,
  step = 1,
  onValueChange,
  label,
  disabled = false,
  size = 'medium',
  id,
  className,
}: SpinButtonProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const density = densityForFluentSize(size)
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const current = isControlled ? value : uncontrolled
  const atMin = min !== undefined && current <= min
  const atMax = max !== undefined && current >= max
  const buttonSize = iconButtonSizeForDensity(density)

  const userDidCommit = useCallback(
    (next: number) => {
      const clamped = clampToRange(next, min, max)
      if (!isControlled) setUncontrolled(clamped)
      onValueChange?.(clamped)
    },
    [isControlled, max, min, onValueChange],
  )

  const control = (
    <div
      data-slot="spin-button"
      data-density={density}
      className={cn(
        'inline-flex items-center gap-kro-tiny text-kro-fore',
        className,
      )}
    >
      <Button
        variant="secondary"
        size={buttonSize}
        aria-label="Decrease"
        disabled={disabled || atMin}
        onClick={() => {
          userDidCommit(current - step)
        }}
      >
        −
      </Button>
      <Input
        id={controlId}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        density={density}
        value={current}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        className={cn(
          'w-24 text-center tabular-nums',
          '[appearance:textfield]',
          '[&::-webkit-inner-spin-button]:appearance-none',
          '[&::-webkit-outer-spin-button]:appearance-none',
        )}
        onChange={(event) => {
          const raw = event.target.value
          if (raw === '') return
          const parsed = event.target.valueAsNumber
          const fallback = Number(raw)
          const next = Number.isNaN(parsed) ? fallback : parsed
          if (Number.isNaN(next)) return
          userDidCommit(next)
        }}
      />
      <Button
        variant="secondary"
        size={buttonSize}
        aria-label="Increase"
        disabled={disabled || atMax}
        onClick={() => {
          userDidCommit(current + step)
        }}
      >
        +
      </Button>
    </div>
  )

  if (label === undefined) return control

  return (
    <div className="inline-flex items-center gap-kro-small text-kro-fore">
      <Label htmlFor={controlId} density={density}>
        {label}
      </Label>
      {control}
    </div>
  )
}
