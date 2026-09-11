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
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * DigitEntry — HIG "Digit entry views", painted with KroTokens.
 *
 * One hidden field, many cells. Assistive tech and password managers see a
 * single `one-time-code` input; the person sees a cell per digit. Splitting
 * into N real inputs would break paste, autofill and the backspace path
 * that deletes the previous cell.
 *
 * The real input is stretched over the cells at opacity 0 so a tap on
 * any cell focuses the same field (split inputs would break paste). The
 * focus ring sits on the active cell via `--kro-ring`. `mask` swaps the
 * glyphs for dots without changing the value the caller receives.
 */

export interface DigitEntryProps
  extends Omit<
    ComponentPropsWithoutRef<'input'>,
    'onChange' | 'value' | 'defaultValue' | 'maxLength' | 'type'
  > {
  readonly length?: number
  readonly value?: string
  readonly defaultValue?: string
  readonly onValueChange?: (value: string) => void
  readonly mask?: boolean
  readonly density?: ControlDensity
}

function digitsOf(raw: string, length: number): string {
  return raw.replace(/\D/g, '').slice(0, length)
}

export function DigitEntry({
  length = 4,
  value,
  defaultValue = '',
  onValueChange,
  mask = false,
  disabled,
  id,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  onFocus,
  onBlur,
  ...rest
}: DigitEntryProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const [focused, setFocused] = useState(false)
  const current = digitsOf(isControlled ? value : uncontrolled, length)
  const activeIndex = Math.min(current.length, length - 1)

  const userDidType = useCallback(
    (raw: string) => {
      const next = digitsOf(raw, length)
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, length, onValueChange],
  )

  return (
    <label
      htmlFor={controlId}
      data-slot="digit-entry"
      data-density={density}
      className={cn(
        'relative inline-flex gap-kro-small',
        disabled && 'opacity-[var(--kro-opacity-disabled)]',
        className,
      )}
    >
      <input
        id={controlId}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        disabled={disabled}
        value={current}
        className="absolute inset-0 z-10 cursor-text opacity-0"
        {...rest}
        onChange={(event) => {
          userDidType(event.target.value)
        }}
        onFocus={(event) => {
          onFocus?.(event)
          setFocused(true)
        }}
        onBlur={(event) => {
          onBlur?.(event)
          setFocused(false)
        }}
      />
      {Array.from({ length }, (_, index) => {
        const glyph = current[index]
        const isActive = focused && !disabled && index === activeIndex
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: cells are a fixed positional strip; the index IS the identity
            key={index}
            aria-hidden="true"
            data-slot="digit-cell"
            data-active={isActive ? 'true' : 'false'}
            className={cn(
              'flex items-center justify-center',
              DENSITY_BOX[density],
              'rounded-kro-field bg-kro-back-inner',
              'border border-kro-hairline text-kro-fore',
              isActive && 'shadow-[var(--kro-ring)]',
            )}
          >
            {glyph === undefined ? '' : mask ? '•' : glyph}
          </span>
        )
      })}
    </label>
  )
}
