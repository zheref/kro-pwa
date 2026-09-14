import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
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

/**
 * MenuButton — Fluent 2 "Menu button", painted with KroTokens.
 *
 * A button that only opens a menu. Unlike a split button, there is no
 * primary action on the face. The label does not change after a choice.
 *
 * `open` is controlled and starts closed; Content mounts only while
 * open so jsdom tests that assert the trigger never stall on Radix
 * popper. The disabled fade lives on `Button` EXACTLY ONCE.
 */

export type MenuButtonTone = 'default' | 'destructive'

export interface MenuButtonItem {
  readonly id: string
  readonly label: string
  readonly tone?: MenuButtonTone
  readonly onSelect: () => void
}

export interface MenuButtonProps {
  readonly label: string
  readonly items: readonly MenuButtonItem[]
  readonly appearance?: FluentButtonAppearance
  readonly size?: FluentControlSize
  readonly disabled?: boolean
  readonly className?: string
}

export function menuButtonItemIsDestructive(item: MenuButtonItem): boolean {
  return item.tone === 'destructive'
}

/** The row body. Tests render this; the panel that wraps it is Storybook-only. */
export function MenuButtonChoiceRow({
  item,
}: {
  readonly item: MenuButtonItem
}) {
  return (
    <span
      data-slot="menu-button-choice"
      data-destructive={menuButtonItemIsDestructive(item) || undefined}
    >
      {item.label}
    </span>
  )
}

export function MenuButton({
  label,
  items,
  appearance = 'secondary',
  size = 'small',
  disabled,
  className,
}: MenuButtonProps) {
  const [open, setOpen] = useState(false)
  const density = densityForFluentSize(size)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant={appearance}
          size={buttonSizeForFluentSize(size)}
          disabled={disabled}
          data-slot="menu-button"
          data-density={density}
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
              destructive={menuButtonItemIsDestructive(item)}
              onSelect={() => item.onSelect()}
            >
              <MenuButtonChoiceRow item={item} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  )
}
