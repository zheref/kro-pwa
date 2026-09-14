import {
  type ComponentPropsWithoutRef,
  useCallback,
  useId,
  useState,
} from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_BOX,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * ColorWell — HIG "Color wells", painted with KroTokens.
 *
 * The well itself is the swatch. A labelled button that hides the colour
 * behind a word would fail the HIG purpose: the person has to see the
 * value, not infer it. The native `input[type=color]` is kept for the
 * platform picker and stretched over the 44px face at opacity 0, so the
 * well *is* the control.
 *
 * There is no component-level hex default. `input[type=color]` cannot
 * take a CSS variable, and hardcoding `#5e6472` (Kro's light `--kro-color-kro`)
 * would freeze the well to one scheme. The caller supplies `value` or
 * `defaultValue` — stories pass `#5e6472` and name it as `kro`.
 *
 * The disabled fade is applied EXACTLY ONCE, on the visible swatch.
 * The hidden input is not a second painted control.
 */

type ColorWellNative = Omit<
  ComponentPropsWithoutRef<'input'>,
  'onChange' | 'type' | 'value' | 'defaultValue'
>

export type ColorWellProps = ColorWellNative & {
  readonly onValueChange?: (value: string) => void
  readonly label?: string
  readonly density?: ControlDensity
} & (
    | { readonly value: string; readonly defaultValue?: string }
    | { readonly defaultValue: string; readonly value?: undefined }
  )

export function ColorWell({
  value,
  defaultValue,
  onValueChange,
  label,
  disabled,
  id,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  ...rest
}: ColorWellProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')
  const current = isControlled ? value : uncontrolled

  const userDidPick = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  const well = (
    <span
      data-density={density}
      className={cn('relative inline-flex', DENSITY_BOX[density], className)}
    >
      <span
        aria-hidden="true"
        data-slot="color-well-swatch"
        className={cn(
          DENSITY_BOX[density],
          'rounded-kro-field',
          disabled && 'opacity-[var(--kro-opacity-disabled)]',
        )}
        style={{
          backgroundColor: current,
          boxShadow: 'inset 0 0 0 1px var(--kro-color-hairline)',
        }}
      />
      <input
        id={controlId}
        type="color"
        value={current}
        disabled={disabled}
        data-slot="color-well"
        className="absolute inset-0 cursor-default opacity-0"
        {...rest}
        onChange={(event) => {
          userDidPick(event.target.value)
        }}
      />
    </span>
  )

  if (label === undefined) return well

  return (
    <div
      className={cn(
        'inline-flex items-center gap-kro-small text-kro-fore',
        DENSITY_TYPE[density],
      )}
    >
      {well}
      <label htmlFor={controlId}>{label}</label>
    </div>
  )
}
