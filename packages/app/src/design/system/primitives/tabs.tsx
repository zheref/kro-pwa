import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../utils/cn'

/**
 * Tabs — the segmented control.
 *
 * Kro uses this for in-surface modes (Plan's timeline / list / matrix), never
 * for top-level navigation: the tab bar and the sidebar are the shell's job
 * (#13) and are routes, not tab panels. Radix `Tabs` implements the WAI-ARIA
 * tabs pattern including roving focus, which is correct for a mode switch and
 * wrong for navigation.
 *
 * The list is KroGlass at control weight; the active trigger is a solid card
 * surface, so the selected mode reads as raised rather than merely tinted —
 * and is therefore legible with colour vision differences (epic AC 9).
 */
export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'kro-glass kro-glass--control inline-flex h-11 items-center justify-center',
        'gap-kro-tiny p-kro-tiny',
        className,
      )}
      {...rest}
    />
  )
}

export function TabsTrigger({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex h-9 flex-1 items-center justify-center gap-kro-small',
        'whitespace-nowrap rounded-kro-pill px-kro-medium font-medium text-sm',
        'text-kro-fore-secondary',
        'kro-motion-quick transition-[color,background-color,box-shadow]',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
        'data-[state=active]:bg-kro-absolute data-[state=active]:text-kro-fore',
        'data-[state=active]:shadow-kro-subtle',
        'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
        "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...rest}
    />
  )
}

export function TabsContent({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...rest}
    />
  )
}
