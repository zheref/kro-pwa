import { useCallback, useId, useState } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_HIT,
  DENSITY_ROW,
} from '../../system/density'
import { Input } from '../../system/primitives/input'
import { cn } from '../../system/utils/cn'

/**
 * Picker — HIG "Pickers", painted with KroTokens.
 *
 * A picker is how a person chooses a date, a time or one value from a
 * short list. Date and time stay native `input` types so the platform
 * owns the calendar and the clock; the list is ours, because a web
 * wheel picker would be a novelty, not a HIG control. The list lives in
 * a grouped card we draw here — GroupedBox is a layout concern and is
 * not imported.
 *
 * Date/time reuse Input's disabled fade. List radios reuse the fade in
 * `hig.css`. Neither wrapper adds a second opacity.
 */

export interface PickerOption {
  readonly value: string
  readonly label: string
}

interface PickerShared {
  readonly value?: string
  readonly defaultValue?: string
  readonly onValueChange?: (value: string) => void
  readonly label?: string
  readonly disabled?: boolean
  readonly id?: string
  readonly className?: string
  readonly density?: ControlDensity
}

export type PickerProps =
  | (PickerShared & {
      readonly kind: 'date' | 'time'
      readonly options?: undefined
    })
  | (PickerShared & {
      readonly kind: 'list'
      readonly options: readonly PickerOption[]
    })

export function Picker(props: PickerProps) {
  const generatedId = useId()
  const controlId = props.id ?? generatedId
  const density = props.density ?? DEFAULT_CONTROL_DENSITY
  const isControlled = props.value !== undefined
  const [uncontrolled, setUncontrolled] = useState(props.defaultValue ?? '')
  const current = isControlled ? props.value : uncontrolled

  const userDidPick = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next)
      props.onValueChange?.(next)
    },
    [isControlled, props.onValueChange],
  )

  if (props.kind === 'list') {
    return (
      <div
        data-slot="picker"
        data-kind="list"
        data-density={density}
        className={cn(
          'flex w-full flex-col gap-kro-small text-kro-fore',
          props.className,
        )}
      >
        {props.label !== undefined && (
          <span id={`${controlId}-label`}>{props.label}</span>
        )}
        <div
          role="radiogroup"
          aria-labelledby={
            props.label !== undefined ? `${controlId}-label` : undefined
          }
          className="overflow-hidden rounded-kro-card bg-kro-absolute shadow-kro-surface"
        >
          {props.options.map((option) => {
            const optionId = `${controlId}-${option.value}`
            return (
              <div
                key={option.value}
                className="flex items-center gap-kro-small px-kro-medium"
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center',
                    DENSITY_HIT[density],
                  )}
                >
                  <input
                    id={optionId}
                    type="radio"
                    name={controlId}
                    value={option.value}
                    checked={current === option.value}
                    disabled={props.disabled}
                    data-density={density}
                    className="kro-hig-radio"
                    onChange={() => {
                      userDidPick(option.value)
                    }}
                  />
                </span>
                <label
                  htmlFor={optionId}
                  className={cn(DENSITY_ROW[density], 'flex-1 py-kro-small')}
                >
                  {option.label}
                </label>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const field = (
    <Input
      id={controlId}
      type={props.kind}
      value={current}
      disabled={props.disabled}
      density={density}
      data-slot="picker"
      data-kind={props.kind}
      data-density={density}
      onChange={(event) => {
        userDidPick(event.target.value)
      }}
    />
  )

  if (props.label === undefined) return field

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-kro-small text-kro-fore',
        props.className,
      )}
    >
      <label htmlFor={controlId}>{props.label}</label>
      {field}
    </div>
  )
}
