import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentPropsWithoutRef } from 'react'
import { type ControlDensity, DEFAULT_CONTROL_DENSITY } from '../density'
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

export interface TabsListProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  readonly density?: ControlDensity
}

export function TabsList({
  className,
  density = DEFAULT_CONTROL_DENSITY,
  ...rest
}: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-density={density}
      className={cn(
        'kro-glass kro-glass--control inline-flex items-center justify-center',
        'gap-kro-tiny p-kro-tiny',
        // Height is border-box and includes `p-kro-tiny` (4px). Compact
        // must clear the 20px trigger (`h-5`); 24px (`h-6`) clips it.
        density === 'compact' ? 'h-7' : 'h-9',
        className,
      )}
      {...rest}
    />
  )
}

export interface TabsTriggerProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  readonly density?: ControlDensity
}

export function TabsTrigger({
  className,
  density = DEFAULT_CONTROL_DENSITY,
  ...rest
}: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-density={density}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-kro-small',
        'whitespace-nowrap rounded-kro-pill px-kro-small font-medium',
        density === 'compact' ? 'h-5 text-xs' : 'h-7 text-sm',
        'text-kro-fore-secondary',
        'kro-motion-quick transition-[color,background-color,box-shadow]',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
        'data-[state=active]:bg-kro-absolute data-[state=active]:text-kro-fore',
        'data-[state=active]:shadow-kro-subtle',
        'disabled:pointer-events-none disabled:opacity-[var(--kro-opacity-disabled)]',
        "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
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
