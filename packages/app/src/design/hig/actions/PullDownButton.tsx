import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  buttonSizeForDensity,
} from '../../system/density'
import { type ButtonProps, Button } from '../../system/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../system/primitives/dropdown-menu'
import { cn } from '../../system/utils/cn'

/**
 * PullDownButton — HIG "Pull-down buttons", painted with KroTokens.
 *
 * A button whose LABEL DOES NOT CHANGE. It names the action ("Add") and
 * opens a menu of things that action can do. Choosing "Habit" does not
 * rename the button to "Habit" — that is a pop-up's job.
 *
 * Destructive items are red AND say what they do. `open` is controlled
 * and starts closed; Content mounts only while open so jsdom tests that
 * assert the trigger never stall on Radix popper.
 */

export type PullDownTone = 'default' | 'destructive'

export interface PullDownButtonItem {
  readonly id: string
  readonly label: string
  readonly tone?: PullDownTone
  readonly onSelect: () => void
}

export interface PullDownButtonProps {
  readonly label: string
  readonly items: readonly PullDownButtonItem[]
  readonly disabled?: boolean
  readonly className?: string
  readonly density?: ControlDensity
  /** Fluent Menu button appearances fold in here. */
  readonly appearance?: ButtonProps['variant']
}

export function pullDownItemIsDestructive(item: PullDownButtonItem): boolean {
  return item.tone === 'destructive'
}

/** The row body. Tests render this; the panel that wraps it is Storybook-only. */
export function PullDownChoiceRow({
  item,
}: {
  readonly item: PullDownButtonItem
}) {
  return (
    <span
      data-slot="pull-down-choice"
      data-destructive={pullDownItemIsDestructive(item) || undefined}
    >
      {item.label}
    </span>
  )
}

export function PullDownButton({
  label,
  items,
  disabled,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  appearance = 'secondary',
}: PullDownButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant={appearance}
          size={buttonSizeForDensity(density)}
          disabled={disabled}
          data-slot="pull-down-button"
          data-density={density}
          data-appearance={appearance}
          className={cn(className)}
        >
          {label}
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      {open ? (
        <DropdownMenuContent>
          {items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              destructive={pullDownItemIsDestructive(item)}
              onSelect={() => item.onSelect()}
            >
              <PullDownChoiceRow item={item} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  )
}
