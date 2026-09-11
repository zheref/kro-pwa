import { Search, X } from 'lucide-react'
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
  DENSITY_ROW,
} from '../../system/density'
import { Input } from '../../system/primitives/input'
import { cn } from '../../system/utils/cn'

/**
 * SearchField — HIG "Search fields", wrapping the recessed `Input`.
 *
 * A search glyph is always present; a clear control appears once there is
 * text. Colour is never the only signal: the glyph names the field, the
 * clear button is labelled "Clear", and Cancel (when offered) is a word.
 *
 * The field reports a string. It does not filter, fetch, or navigate.
 */

export interface SearchFieldProps
  extends Omit<
    ComponentPropsWithoutRef<'input'>,
    'type' | 'value' | 'defaultValue' | 'onChange'
  > {
  readonly value?: string
  readonly defaultValue?: string
  readonly onValueChange?: (value: string) => void
  readonly onCancel?: () => void
  readonly density?: ControlDensity
}

export function SearchField({
  value,
  defaultValue = '',
  onValueChange,
  onCancel,
  placeholder = 'Search',
  id,
  className,
  disabled,
  density = DEFAULT_CONTROL_DENSITY,
  ...rest
}: SearchFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const current = isControlled ? value : uncontrolled

  const userDidChange = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  return (
    <div
      data-slot="search-field"
      data-density={density}
      className={cn('flex items-center gap-kro-small', className)}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-kro-fore-secondary"
        />
        <Input
          id={fieldId}
          type="search"
          value={current}
          disabled={disabled}
          density={density}
          placeholder={placeholder}
          className={cn(
            'pl-10 [&::-webkit-search-cancel-button]:hidden',
            current.length > 0 && 'pr-12',
          )}
          onChange={(event) => userDidChange(event.target.value)}
          {...rest}
        />
        {current.length > 0 ? (
          <button
            type="button"
            aria-label="Clear"
            disabled={disabled}
            className={cn(
              'absolute top-1/2 right-1 inline-flex -translate-y-1/2',
              DENSITY_BOX[density],
              'items-center justify-center rounded-kro-small text-kro-fore-secondary',
              'outline-none hover:text-kro-fore',
              'focus-visible:shadow-[var(--kro-ring)]',
              'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
            )}
            onClick={() => userDidChange('')}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
      {onCancel === undefined ? null : (
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'shrink-0 px-kro-tiny font-medium text-kro-accent',
            DENSITY_ROW[density],
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
            'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
          )}
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
    </div>
  )
}
