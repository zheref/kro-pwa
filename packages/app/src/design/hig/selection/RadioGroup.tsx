import {
  createContext,
  type ComponentPropsWithoutRef,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useState,
} from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_HIT,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * RadioGroup / Radio — HIG "Radio buttons", filed with Selection and input.
 *
 * A radio is a mutually exclusive choice, not a checkbox that happens to be
 * round. The group owns the name and the selected value so a lone Radio can
 * never form a one-option group by accident. The 22px disc is the compact
 * mark; the 44px wrapper is the finger target.
 *
 * The disabled fade is applied EXACTLY ONCE, in `hig.css` on `:disabled`.
 * Fading the row as well would multiply the two and drop the disc below
 * the 3:1 floor for UI elements.
 */

interface RadioGroupContextValue {
  readonly name: string
  readonly value: string | undefined
  readonly userDidSelect: (next: string) => void
  readonly density: ControlDensity
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

function useRadioGroup(): RadioGroupContextValue {
  const context = useContext(RadioGroupContext)
  if (context === null) {
    throw new Error('Radio must render inside RadioGroup')
  }
  return context
}

export interface RadioGroupProps {
  readonly name: string
  readonly value?: string
  readonly defaultValue?: string
  readonly onValueChange?: (value: string) => void
  readonly legend?: string
  readonly className?: string
  readonly density?: ControlDensity
  readonly children: ReactNode
}

export function RadioGroup({
  name,
  value,
  defaultValue,
  onValueChange,
  legend,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  children,
}: RadioGroupProps) {
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const current = isControlled ? value : uncontrolled

  const userDidSelect = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  return (
    <RadioGroupContext.Provider
      value={{ name, value: current, userDidSelect, density }}
    >
      <fieldset
        data-slot="radio-group"
        data-density={density}
        className={cn(
          'm-0 flex min-w-0 flex-col gap-kro-small border-0 p-0 text-kro-fore',
          DENSITY_TYPE[density],
          className,
        )}
      >
        {legend !== undefined && (
          <legend className="px-0 pb-kro-small">{legend}</legend>
        )}
        {children}
      </fieldset>
    </RadioGroupContext.Provider>
  )
}

export interface RadioProps
  extends Omit<
    ComponentPropsWithoutRef<'input'>,
    'onChange' | 'type' | 'name' | 'checked' | 'defaultChecked'
  > {
  readonly value: string
  readonly label: string
}

export function Radio({
  value,
  label,
  disabled,
  id,
  className,
  ...rest
}: RadioProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const group = useRadioGroup()
  const isOn = group.value === value

  return (
    <div className="inline-flex items-center gap-kro-small text-kro-fore">
      <span
        className={cn(
          'inline-flex items-center justify-center',
          DENSITY_HIT[group.density],
        )}
      >
        <input
          id={controlId}
          type="radio"
          name={group.name}
          value={value}
          checked={isOn}
          disabled={disabled}
          data-slot="radio"
          data-density={group.density}
          className={cn('kro-hig-radio', className)}
          {...rest}
          onChange={() => {
            group.userDidSelect(value)
          }}
        />
      </span>
      <label htmlFor={controlId}>{label}</label>
    </div>
  )
}
