import { X } from 'lucide-react'
import { type KeyboardEvent, useCallback, useId, useState } from 'react'
import { Label } from '../../hig/layout/Label'
import { DENSITY_ROW, DENSITY_TYPE } from '../../system/density'
import { Input } from '../../system/primitives/input'
import { cn } from '../../system/utils/cn'
import { type FluentControlSize, densityForFluentSize } from '../sizes'

/**
 * TagPicker — Fluent 2 TagPicker, painted with KroTokens.
 *
 * Dismissible tags plus a field that filters a suggestion list. The
 * list is KroGlass over the field, the same recipe as ComboBox. The
 * Input already applies the disabled fade once — this wrapper does not
 * add another.
 */

export interface TagPickerProps {
  readonly options: readonly string[]
  readonly value?: readonly string[]
  readonly defaultValue?: readonly string[]
  readonly onValueChange?: (tags: readonly string[]) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly size?: FluentControlSize
  readonly label?: string
  readonly id?: string
  readonly className?: string
}

export function TagPicker({
  options,
  value,
  defaultValue = [],
  onValueChange,
  placeholder,
  disabled = false,
  size = 'medium',
  label,
  id,
  className,
}: TagPickerProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const listId = `${controlId}-list`
  const density = densityForFluentSize(size)
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const selected = isControlled ? value : uncontrolled
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const filtered = options.filter(
    (option) =>
      !selected.includes(option) &&
      option.toLowerCase().includes(query.toLowerCase()),
  )
  const isOpen = open && !disabled && filtered.length > 0
  const activeOptionId =
    isOpen && filtered[highlight] !== undefined
      ? `${listId}-option-${highlight}`
      : undefined

  const userDidChangeTags = useCallback(
    (next: readonly string[]) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  const userDidPick = useCallback(
    (tag: string) => {
      if (selected.includes(tag)) return
      userDidChangeTags([...selected, tag])
      setQuery('')
      setOpen(false)
      setHighlight(0)
    },
    [selected, userDidChangeTags],
  )

  const userDidRemove = useCallback(
    (tag: string) => {
      userDidChangeTags(selected.filter((item) => item !== tag))
    },
    [selected, userDidChangeTags],
  )

  const userDidNavigate = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
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
    [disabled, filtered, highlight, isOpen, open, userDidPick],
  )

  const field = (
    <div
      data-slot="tag-picker"
      data-density={density}
      className={cn(
        'flex w-full flex-col gap-kro-tiny text-kro-fore',
        className,
      )}
    >
      {selected.length === 0 ? null : (
        <div className="flex flex-wrap gap-kro-tiny">
          {selected.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-label={`Remove ${tag}`}
              disabled={disabled}
              className={cn(
                'inline-flex items-center gap-1 rounded-kro-pill',
                'border border-kro-hairline bg-kro-absolute',
                'px-2 text-kro-fore',
                DENSITY_TYPE[density],
                'disabled:pointer-events-none',
                'disabled:opacity-[var(--kro-opacity-disabled)]',
              )}
              onClick={() => {
                userDidRemove(tag)
              }}
            >
              {tag}
              <X aria-hidden="true" className="size-3" />
            </button>
          ))}
        </div>
      )}
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
          value={query}
          density={density}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => {
            if (!disabled) setOpen(true)
          }}
          onBlur={() => {
            setOpen(false)
          }}
          onKeyDown={userDidNavigate}
        />
        {isOpen ? (
          <div
            id={listId}
            role="listbox"
            className={cn(
              'kro-glass absolute top-full right-0 left-0 z-50',
              'mt-kro-tiny overflow-hidden rounded-kro-field',
            )}
          >
            {filtered.map((option, index) => (
              <button
                key={option}
                type="button"
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={index === highlight}
                className={cn(
                  'flex w-full items-center px-kro-small text-left',
                  'text-kro-fore',
                  DENSITY_ROW[density],
                  index === highlight && 'bg-kro-back-inner',
                )}
                onMouseDown={(event) => {
                  // Keep the field focused long enough for the click
                  // to land; a blur would close the list first.
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
        ) : null}
      </div>
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
