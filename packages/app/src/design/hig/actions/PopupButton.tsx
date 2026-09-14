import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  buttonSizeForDensity,
} from '../../system/density'
import { Button } from '../../system/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../system/primitives/dropdown-menu'
import { cn } from '../../system/utils/cn'

/**
 * PopupButton — HIG "Pop-up buttons", painted with KroTokens.
 *
 * A button that shows the CURRENT choice and opens a mutually exclusive
 * menu. The trigger label is the selected option; choosing another option
 * replaces it. That is the difference from a pull-down, whose label never
 * changes.
 *
 * `open` is controlled and starts closed. Content is mounted only while
 * open so a jsdom test that renders the trigger does not stall on Radix
 * popper (see `system/primitives/__tests__/radixEnvironment.tsx`).
 */

export interface PopupButtonOption {
  readonly value: string
  readonly label: string
}

export interface PopupButtonProps {
  readonly value: string
  readonly options: readonly PopupButtonOption[]
  readonly onValueChange: (value: string) => void
  readonly disabled?: boolean
  readonly 'aria-label'?: string
  readonly className?: string
  readonly density?: ControlDensity
}

export function selectedPopupLabel(
  options: readonly PopupButtonOption[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value
}

/** The row body. Tests render this; the panel that wraps it is Storybook-only. */
export function PopupChoiceRow({
  option,
  selected,
}: {
  readonly option: PopupButtonOption
  readonly selected: boolean
}) {
  return (
    <>
      <span className="flex-1">{option.label}</span>
      {selected ? <Check aria-hidden="true" className="size-4" /> : null}
    </>
  )
}

export function PopupButton({
  value,
  options,
  onValueChange,
  disabled,
  'aria-label': ariaLabel,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: PopupButtonProps) {
  const [open, setOpen] = useState(false)
  const triggerLabel = selectedPopupLabel(options, value)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="secondary"
          size={buttonSizeForDensity(density)}
          disabled={disabled}
          aria-label={ariaLabel}
          data-slot="popup-button"
          data-density={density}
          className={cn(className)}
        >
          {triggerLabel}
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      {open ? (
        <DropdownMenuContent>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => onValueChange(option.value)}
            >
              <PopupChoiceRow
                option={option}
                selected={option.value === value}
              />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  )
}
