import type { ComponentPropsWithoutRef } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  buttonSizeForDensity,
} from '../../system/density'
import { Button } from '../../system/primitives/button'
import {
  Sheet,
  SheetContent,
  type SheetContentProps,
  SheetTitle,
  SheetTrigger,
} from '../../system/primitives/sheet'
import { cn } from '../../system/utils/cn'

/**
 * ActionSheet — HIG "Action sheets", a stacked set of choices.
 *
 * Built on `Sheet` so the bottom-edge presentation, focus trap and
 * dismissal stay one implementation. Actions are full-width density rows.
 * Cancel is the secondary variant; destructive uses the danger role AND
 * a named label — colour is never the only signal.
 *
 * `SheetContent` already forces `position: fixed` inline. Do not fight it.
 */

export const ActionSheet = Sheet
export const ActionSheetTrigger = SheetTrigger
export const ActionSheetTitle = SheetTitle

export function ActionSheetContent({
  hideClose = true,
  ...rest
}: SheetContentProps) {
  return <SheetContent hideClose={hideClose} {...rest} />
}

export type ActionSheetTone = 'default' | 'destructive' | 'cancel'

export interface ActionSheetActionProps
  extends ComponentPropsWithoutRef<'button'> {
  readonly tone?: ActionSheetTone
  readonly density?: ControlDensity
}

export function ActionSheetAction({
  tone = 'default',
  density = DEFAULT_CONTROL_DENSITY,
  className,
  ...rest
}: ActionSheetActionProps) {
  return (
    <Button
      type="button"
      variant={tone === 'cancel' ? 'secondary' : 'ghost'}
      size={buttonSizeForDensity(density)}
      data-slot="action-sheet-action"
      data-tone={tone}
      data-density={density}
      className={cn(
        'w-full',
        tone === 'destructive' && 'text-kro-banner-danger',
        className,
      )}
      {...rest}
    />
  )
}
