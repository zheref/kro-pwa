import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../utils/cn'

/**
 * Popover — the desktop idiom.
 *
 * The epic fixes canonical desktop sizes for the four popover surfaces (Inbox
 * 560x620, Visibility 460x560, Profile w300, Do notifications 380x440 min).
 * They are named here rather than retyped in four feature children, so the
 * sizes stay a design decision instead of four independent guesses.
 *
 * The panel is KroGlass, which is why it carries no background utility of its
 * own — `glass.css` owns the fill, the rim, the sheen and every fallback.
 */
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

/** The canonical desktop popover sizes, from KroApple's macOS surfaces. */
export const POPOVER_SIZE = {
  inbox: { width: 560, height: 620 },
  visibility: { width: 460, height: 560 },
  profile: { width: 300 },
  doNotifications: { width: 380, minHeight: 440 },
} as const

export type PopoverSizeName = keyof typeof POPOVER_SIZE

/**
 * The classes this wrapper contributes, named so they can be asserted without
 * mounting the panel.
 *
 * Mounting a Radix popper under jsdom costs seconds — see the measurement in
 * `__tests__/radixEnvironment.tsx` — so the suite checks the theming contract
 * here and leaves placement and dismissal to Radix's own tests and to the
 * Storybook test-runner (wired, but not part of `make test`).
 */
export const POPOVER_CLASSES = {
  content: cn(
    'kro-glass z-50 w-72 rounded-kro-surface p-kro-medium',
    'origin-(--radix-popover-content-transform-origin)',
  ),
} as const

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 8,
  ...rest
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(POPOVER_CLASSES.content, className)}
        {...rest}
      />
    </PopoverPrimitive.Portal>
  )
}
