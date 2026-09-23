import {
  createContext,
  useContext,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
} from '../../system/density'
import { ROW_HIGHLIGHT } from '../../system/rowHighlight'
import { cn } from '../../system/utils/cn'

/**
 * Menu — a command list that lives inside something else.
 *
 * It does not position itself and it does not portal. A popover or a sheet
 * owns the surface; this is the list inside it. Compact is the desktop row,
 * one step above the 24px control floor so a command list can breathe.
 * Hover and focus use the shared row highlight: a translucent `absolute`
 * fill at 25%, with a glass-rim stroke that is lighter than the resting
 * hairline. The label color stays put. Comfortable is the mobile row: the next
 * padding step, with the same fill on press.
 *
 * Inset is one pair per density. Compact is `kro-small` on every side of a
 * row; comfortable is `kro-medium`. A caller that pads the popover uses the
 * same step, so the gutter around the panel matches the gutter inside a row.
 */

const MenuDensityContext = createContext<ControlDensity>(
  DEFAULT_CONTROL_DENSITY,
)

const INSET = {
  compact: 'gap-kro-small px-kro-small py-kro-small',
  comfortable: 'gap-kro-medium px-kro-medium py-kro-medium',
} as const

export const MENU_CLASSES = {
  root: 'flex w-full flex-col',
  /** The gutter a popover uses around this list. Same step as the row inset. */
  frame: 'p-kro-small',
  frameComfortable: 'p-kro-medium',
  /** Shared by a row and by a header that sits in the same panel. */
  inset: INSET.compact,
  insetComfortable: INSET.comfortable,
  item: cn(
    'flex w-full items-center rounded-kro-small text-left text-kro-fore',
    'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    ROW_HIGHLIGHT,
  ),
  itemCompact: cn(
    INSET.compact,
    'min-h-8 text-sm',
    "[&_svg:not([class*='size-'])]:size-4",
  ),
  itemComfortable: cn(
    INSET.comfortable,
    'min-h-10 text-base',
    "[&_svg:not([class*='size-'])]:size-5",
    'active:border-(--kro-glass-rim) active:bg-kro-absolute/25',
  ),
  itemDestructive: 'text-kro-banner-danger',
  separator: 'h-px border-0 bg-kro-hairline',
  separatorCompact: 'mx-kro-small my-kro-small',
  separatorComfortable: 'mx-kro-medium my-kro-medium',
  label: 'font-medium text-kro-fore-secondary',
  labelCompact: 'px-kro-small py-kro-small text-sm',
  labelComfortable: 'px-kro-medium py-kro-medium text-base',
} as const

export interface MenuProps {
  readonly children: ReactNode
  readonly className?: string
  readonly density?: ControlDensity
  /** Names the list for assistive tech. Omit when a visible label does it. */
  readonly label?: string
}

export function Menu({
  children,
  className,
  density = DEFAULT_CONTROL_DENSITY,
  label,
}: MenuProps) {
  return (
    <MenuDensityContext.Provider value={density}>
      <div
        data-slot="menu"
        data-density={density}
        role="menu"
        aria-label={label}
        className={cn(MENU_CLASSES.root, className)}
        onKeyDown={onMenuKeyDown}
      >
        {children}
      </div>
    </MenuDensityContext.Provider>
  )
}

function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (
    event.key !== 'ArrowDown' &&
    event.key !== 'ArrowUp' &&
    event.key !== 'Home' &&
    event.key !== 'End'
  ) {
    return
  }

  const items = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    ),
  ]
  if (items.length === 0) return

  const current = items.indexOf(document.activeElement as HTMLButtonElement)
  event.preventDefault()

  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : event.key === 'ArrowDown'
          ? current < 0
            ? 0
            : (current + 1) % items.length
          : current <= 0
            ? items.length - 1
            : current - 1

  items[nextIndex]?.focus()
}

export interface MenuItemProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'onClick'> {
  readonly destructive?: boolean
  readonly onSelect?: () => void
}

export function MenuItem({
  className,
  destructive = false,
  disabled = false,
  onSelect,
  children,
  ...rest
}: MenuItemProps) {
  const density = useContext(MenuDensityContext)

  return (
    <button
      type="button"
      role="menuitem"
      data-slot="menu-item"
      data-density={density}
      data-destructive={destructive || undefined}
      disabled={disabled}
      className={cn(
        MENU_CLASSES.item,
        density === 'compact'
          ? MENU_CLASSES.itemCompact
          : MENU_CLASSES.itemComfortable,
        destructive && MENU_CLASSES.itemDestructive,
        className,
      )}
      onClick={() => {
        if (!disabled) onSelect?.()
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

export interface MenuSeparatorProps {
  readonly className?: string
}

export function MenuSeparator({ className }: MenuSeparatorProps) {
  const density = useContext(MenuDensityContext)

  return (
    <hr
      data-slot="menu-separator"
      className={cn(
        MENU_CLASSES.separator,
        density === 'compact'
          ? MENU_CLASSES.separatorCompact
          : MENU_CLASSES.separatorComfortable,
        className,
      )}
    />
  )
}

export interface MenuLabelProps {
  readonly children: ReactNode
  readonly className?: string
}

export function MenuLabel({ children, className }: MenuLabelProps) {
  const density = useContext(MenuDensityContext)

  return (
    <div
      data-slot="menu-label"
      data-density={density}
      className={cn(
        MENU_CLASSES.label,
        density === 'compact'
          ? MENU_CLASSES.labelCompact
          : MENU_CLASSES.labelComfortable,
        className,
      )}
    >
      {children}
    </div>
  )
}
