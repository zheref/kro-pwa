import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../utils/cn'

/**
 * DropdownMenu — the contextual action list.
 *
 * Compact is the default row. Menu rows sit flush, so comfortable (h-9)
 * is the mobile preview rather than a silent 44px floor.
 *
 * A destructive item is red AND says what it does — colour is never the only
 * signal (epic AC 9).
 */
export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuSub = DropdownMenuPrimitive.Sub
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

/**
 * The classes this wrapper contributes, named so the theming contract can be
 * asserted without mounting the menu.
 *
 * Mounting a Radix popper under jsdom costs seconds — see the measurement in
 * `__tests__/radixEnvironment.tsx`. Behaviour that needs the panel on screen
 * belongs to Radix's own tests and to the Storybook test-runner (wired, but
 * not part of `make test`).
 */
export const DROPDOWN_MENU_CLASSES = {
  content: cn(
    'kro-glass z-50 min-w-[12rem] overflow-hidden rounded-kro-field p-kro-tiny',
    'origin-(--radix-dropdown-menu-content-transform-origin)',
  ),
  item: cn(
    'relative flex h-6 cursor-default select-none items-center gap-kro-small',
    'rounded-kro-small px-kro-small text-xs outline-none',
    'text-kro-fore focus:bg-kro-back-inner',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-[var(--kro-opacity-disabled)]',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
  ),
  itemDestructive: 'text-kro-banner-danger focus:bg-kro-banner-danger/10',
  checkboxItem: cn(
    'relative flex h-6 cursor-default select-none items-center gap-kro-small',
    'rounded-kro-small py-kro-tiny pr-kro-small pl-8 text-xs outline-none',
    'text-kro-fore focus:bg-kro-back-inner',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-[var(--kro-opacity-disabled)]',
  ),
  label: cn(
    'px-kro-small py-kro-tiny font-medium text-kro-fore-secondary text-sm',
  ),
  separator: '-mx-kro-tiny my-kro-tiny h-px bg-kro-hairline',
} as const

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...rest
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(DROPDOWN_MENU_CLASSES.content, className)}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

export interface DropdownMenuItemProps
  extends ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  readonly destructive?: boolean
}

export function DropdownMenuItem({
  className,
  destructive = false,
  ...rest
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-destructive={destructive || undefined}
      className={cn(
        DROPDOWN_MENU_CLASSES.item,
        destructive && DROPDOWN_MENU_CLASSES.itemDestructive,
        className,
      )}
      {...rest}
    />
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...rest
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      checked={checked}
      className={cn(DROPDOWN_MENU_CLASSES.checkboxItem, className)}
      {...rest}
    >
      <span className="absolute left-kro-small flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

export function DropdownMenuLabel({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn(DROPDOWN_MENU_CLASSES.label, className)}
      {...rest}
    />
  )
}

export function DropdownMenuSeparator({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(DROPDOWN_MENU_CLASSES.separator, className)}
      {...rest}
    />
  )
}
