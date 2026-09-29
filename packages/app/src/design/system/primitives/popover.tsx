import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../utils/cn'
import { useDefaultCollisionPadding } from './collision'

/**
 * Popover — a navigation panel anchored to the control that presented it.
 *
 * The epic fixes canonical desktop sizes for the four popover surfaces (Inbox
 * 560x620, Visibility 460x560, Profile w300, Do notifications 380x440 min).
 * They are named here rather than retyped in four feature children, so the
 * sizes stay a design decision instead of four independent guesses.
 *
 * The panel is KroGlass, the same material as the sidebar: blur on ::before,
 * and the light rim on ::after. The corner is a menu row's radius. A clip
 * or a stroked path made that rim rasterize, so this panel does not use one.
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
    'kro-glass kro-popover relative z-50 w-72 p-kro-medium',
    'origin-(--radix-popover-content-transform-origin)',
  ),
} as const

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 8,
  avoidCollisions = true,
  collisionPadding,
  children,
  ...rest
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  // Flip/shift to fit, clear of the viewport edge AND the shell's sidebar.
  const padding = useDefaultCollisionPadding(
    collisionPadding as Parameters<typeof useDefaultCollisionPadding>[0],
  )
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        avoidCollisions={avoidCollisions}
        collisionPadding={padding}
        className={cn(POPOVER_CLASSES.content, className)}
        {...rest}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}
