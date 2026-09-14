import { ChevronDown } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { Label } from '../../hig/layout/Label'
import { DENSITY_FIELD } from '../../system/density'
import { cn } from '../../system/utils/cn'
import { type FluentControlSize, densityForFluentSize } from '../sizes'

/**
 * Select — Fluent 2 Select, painted with KroTokens.
 *
 * A native `<select>` so the platform owns the menu. The field is the
 * same recessed surface as Input (`back-inner`, hairline). Outline is
 * the hairline box; underline is a bottom edge only.
 *
 * The disabled fade is applied once, on the wrapper that also holds
 * the chevron — putting it on the `<select>` as well would leave the
 * glyph at full opacity, and wrapping a faded select would multiply.
 */

export type SelectAppearance = 'outline' | 'underline'

export interface SelectOption {
  readonly value: string
  readonly label: string
}

export interface SelectProps {
  readonly options: readonly SelectOption[]
  readonly value?: string
  readonly defaultValue?: string
  readonly onValueChange?: (value: string) => void
  readonly appearance?: SelectAppearance
  readonly size?: FluentControlSize
  readonly disabled?: boolean
  readonly label?: string
  readonly id?: string
  readonly name?: string
  readonly className?: string
}

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  appearance = 'outline',
  size = 'medium',
  disabled = false,
  label,
  id,
  name,
  className,
}: SelectProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const density = densityForFluentSize(size)
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(
    defaultValue ?? options[0]?.value ?? '',
  )
  const current = isControlled ? value : uncontrolled

  const userDidChange = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  const field = (
    <div
      className={cn(
        'relative w-full',
        disabled && 'pointer-events-none opacity-[var(--kro-opacity-disabled)]',
      )}
    >
      <select
        id={controlId}
        name={name}
        data-slot="select"
        data-density={density}
        data-appearance={appearance}
        disabled={disabled}
        value={current}
        className={cn(
          'kro-fluent-select flex w-full min-w-0 px-kro-small pr-8',
          DENSITY_FIELD[density],
          'bg-kro-back-inner text-kro-fore',
          'kro-motion-quick transition-[border-color,box-shadow]',
          'outline-none focus-visible:border-kro-accent',
          'focus-visible:shadow-[var(--kro-ring)]',
          appearance === 'underline'
            ? 'rounded-none border-0 border-b border-kro-hairline'
            : 'rounded-kro-field border border-kro-hairline',
          className,
        )}
        onChange={(event) => {
          userDidChange(event.target.value)
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 right-2 size-3.5',
          '-translate-y-1/2 text-kro-fore-secondary',
        )}
      />
    </div>
  )

  if (label === undefined) return field

  return (
    <div className="flex w-full flex-col gap-kro-small text-kro-fore">
      <Label htmlFor={controlId} density={density}>
        {label}
      </Label>
      {field}
    </div>
  )
}
