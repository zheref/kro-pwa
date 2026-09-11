import { ChevronDown } from 'lucide-react'
import { type MouseEventHandler, type ReactNode, useState } from 'react'
import { Button } from '../../system/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../system/primitives/dropdown-menu'
import { cn } from '../../system/utils/cn'
import {
  type FluentControlSize,
  buttonSizeForFluentSize,
  densityForFluentSize,
} from '../sizes'
import type { FluentButtonAppearance } from './appearance'
import {
  MenuButtonChoiceRow,
  menuButtonItemIsDestructive,
  type MenuButtonItem,
} from './MenuButton'

/**
 * SplitButton — Fluent 2 "Split button", painted with KroGlass.
 *
 * A primary action plus a chevron that opens related actions. The
 * dominant action is not repeated in the menu. The two faces sit in
 * one grouped glass cluster; each face is a `Button`, so the disabled
 * fade lives on those primitives EXACTLY ONCE — never on the wrapper.
 *
 * Content mounts only while the menu is open so jsdom tests that click
 * the primary action never stall on Radix popper.
 */

export interface SplitButtonProps {
  readonly appearance?: FluentButtonAppearance
  readonly size?: FluentControlSize
  readonly disabled?: boolean
  readonly items: readonly MenuButtonItem[]
  readonly children: ReactNode
  readonly className?: string
  readonly onClick?: MouseEventHandler<HTMLButtonElement>
}

export function SplitButton({
  appearance = 'secondary',
  size = 'small',
  disabled,
  items,
  children,
  className,
  onClick,
}: SplitButtonProps) {
  const [open, setOpen] = useState(false)
  const density = densityForFluentSize(size)
  const buttonSize = buttonSizeForFluentSize(size)

  return (
    <div
      data-slot="split-button"
      data-density={density}
      className={cn('inline-flex items-stretch', className)}
    >
      <Button
        variant={appearance}
        size={buttonSize}
        disabled={disabled}
        onClick={onClick}
        className="rounded-e-none"
      >
        {children}
      </Button>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button
            variant={appearance}
            size={buttonSize}
            disabled={disabled}
            aria-label="More actions"
            className="rounded-s-none border-l border-kro-hairline px-1.5"
          >
            <ChevronDown aria-hidden="true" className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        {open ? (
          <DropdownMenuContent>
            {items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                destructive={menuButtonItemIsDestructive(item)}
                onSelect={() => item.onSelect()}
              >
                <MenuButtonChoiceRow item={item} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        ) : null}
      </DropdownMenu>
    </div>
  )
}
