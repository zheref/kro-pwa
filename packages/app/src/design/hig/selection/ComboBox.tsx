import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  useCallback,
  useId,
  useState,
} from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_ROW,
} from '../../system/density'
import { Input } from '../../system/primitives/input'
import { cn } from '../../system/utils/cn'

/**
 * ComboBox — HIG "Combo boxes", painted with KroTokens.
 *
 * A combo box is an editable field whose menu is a suggestion, not a
 * closed set. Filtering as the person types is the point: they can keep
 * a value that is not on the list (an endeavor title they are still
 * naming) or pick one that is. The list sits in KroGlass so it reads as
 * a panel over the field, not as a second form control.
 *
 * The Input already applies the disabled fade once. The list is not a
 * second control, so it does not get its own fade.
 */

export interface ComboBoxProps
  extends Omit<
    ComponentPropsWithoutRef<'input'>,
    'onChange' | 'type' | 'value' | 'defaultValue' | 'role'
  > {
  readonly value?: string
  readonly defaultValue?: string
  readonly onValueChange?: (value: string) => void
  readonly options: readonly string[]
  readonly label?: string
  readonly density?: ControlDensity
}

export function ComboBox({
  value,
  defaultValue = '',
  onValueChange,
  options,
  label,
  disabled,
  id,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  placeholder,
  onKeyDown,
  onFocus,
  onBlur,
  ...rest
}: ComboBoxProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const listId = `${controlId}-list`
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const current = isControlled ? value : uncontrolled
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const filtered = options.filter((option) =>
    option.toLowerCase().includes(current.toLowerCase()),
  )
  const isOpen = open && !disabled && filtered.length > 0
  const activeOptionId =
    isOpen && filtered[highlight] !== undefined
      ? `${listId}-option-${highlight}`
      : undefined

  const userDidType = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
      setOpen(true)
      setHighlight(0)
    },
    [isControlled, onValueChange],
  )

  const userDidPick = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
      setOpen(false)
    },
    [isControlled, onValueChange],
  )

  const userDidNavigate = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented || disabled) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!open) {
          setOpen(true)
          setHighlight(0)
          return
        }
        if (filtered.length === 0) return
        setHighlight((index) => (index + 1) % filtered.length)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (!open || filtered.length === 0) return
        setHighlight((index) => (index - 1 + filtered.length) % filtered.length)
        return
      }

      if (event.key === 'Enter') {
        const picked = filtered[highlight]
        if (isOpen && picked !== undefined) {
          event.preventDefault()
          userDidPick(picked)
        }
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    },
    [disabled, filtered, highlight, isOpen, onKeyDown, open, userDidPick],
  )

  const field = (
    <div className="relative w-full">
      <Input
        id={controlId}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        disabled={disabled}
        placeholder={placeholder}
        value={current}
        density={density}
        className={className}
        {...rest}
        onChange={(event) => {
          userDidType(event.target.value)
        }}
        onFocus={(event) => {
          onFocus?.(event)
          if (!disabled) setOpen(true)
        }}
        onBlur={(event) => {
          onBlur?.(event)
          setOpen(false)
        }}
        onKeyDown={userDidNavigate}
      />
      {isOpen && (
        <div
          id={listId}
          role="listbox"
          data-slot="combo-box-list"
          className="kro-glass absolute top-full right-0 left-0 z-50 mt-kro-tiny overflow-hidden rounded-kro-field"
        >
          {filtered.map((option, index) => (
            <button
              key={option}
              type="button"
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === highlight}
              className={cn(
                'flex w-full items-center px-kro-small text-left text-kro-fore',
                DENSITY_ROW[density],
                index === highlight && 'bg-kro-back-inner',
              )}
              onMouseDown={(event) => {
                // Keep the field focused long enough for the click to land;
                // a blur would close the list before `onClick` fires.
                event.preventDefault()
              }}
              onClick={() => {
                userDidPick(option)
              }}
              onMouseEnter={() => {
                setHighlight(index)
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  if (label === undefined) return field

  return (
    <div className="flex w-full flex-col gap-kro-small text-kro-fore">
      <label htmlFor={controlId}>{label}</label>
      {field}
    </div>
  )
}
