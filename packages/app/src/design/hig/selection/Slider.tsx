import {
  type ComponentPropsWithoutRef,
  useCallback,
  useId,
  useState,
} from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * Slider — HIG "Sliders", painted with KroTokens.
 *
 * The thumb and the track geometry live in `hig.css` because a range input
 * cannot be restyled with utilities alone. This component does not redraw
 * the thumb: the 28px knob is already the compact pointer target Apple
 * specifies, and inventing a second one would drift from the recipe.
 *
 * The disabled fade is applied EXACTLY ONCE, in `hig.css` on `:disabled`.
 */

export interface SliderProps
  extends Omit<
    ComponentPropsWithoutRef<'input'>,
    'onChange' | 'type' | 'value' | 'defaultValue' | 'min' | 'max' | 'step'
  > {
  readonly value?: number
  readonly defaultValue?: number
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly onValueChange?: (value: number) => void
  readonly label?: string
  readonly showValue?: boolean
  readonly density?: ControlDensity
}

export function Slider({
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  label,
  showValue = false,
  disabled,
  id,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  ...rest
}: SliderProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? min)
  const current = isControlled ? value : uncontrolled

  const userDidSlide = useCallback(
    (next: number) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  const control = (
    <div className={cn('flex w-full items-center', DENSITY_ROW[density])}>
      <input
        id={controlId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        disabled={disabled}
        data-slot="slider"
        data-density={density}
        className={cn('kro-hig-slider', className)}
        {...rest}
        onChange={(event) => {
          userDidSlide(Number(event.target.value))
        }}
      />
    </div>
  )

  if (label === undefined && !showValue) return control

  return (
    <div className="flex w-full flex-col gap-kro-small text-kro-fore">
      <div className="flex items-center justify-between gap-kro-small">
        {label !== undefined && <label htmlFor={controlId}>{label}</label>}
        {showValue && (
          <span className="text-kro-fore-secondary tabular-nums">
            {current}
          </span>
        )}
      </div>
      {control}
    </div>
  )
}
