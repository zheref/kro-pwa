import type { ComponentPropsWithoutRef } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import {
  Dialog,
  DialogContent,
  type DialogContentProps,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../system/primitives/dialog'
import { cn } from '../../system/utils/cn'

/**
 * Alert — HIG "Alerts", a modal choice that must be made.
 *
 * Built on the existing Dialog primitive so focus, escape and the scrim
 * stay one implementation. The close-X is withheld by default: an alert
 * is a confirm-or-cancel, not dismissible chrome. Destructive actions
 * are named in the caller's button label, not communicated by colour
 * alone.
 *
 * `DialogContent` already forces `position: fixed` inline. Do not fight it.
 */

export const Alert = Dialog
export const AlertTrigger = DialogTrigger
export const AlertTitle = DialogTitle
export const AlertDescription = DialogDescription

export function AlertContent({
  hideClose = true,
  ...rest
}: DialogContentProps) {
  return <DialogContent hideClose={hideClose} {...rest} />
}

export interface AlertActionsProps extends ComponentPropsWithoutRef<'div'> {
  readonly density?: ControlDensity
}

export function AlertActions({
  className,
  density = DEFAULT_CONTROL_DENSITY,
  ...rest
}: AlertActionsProps) {
  return (
    <div
      data-slot="alert-actions"
      data-density={density}
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end gap-kro-small',
        DENSITY_TYPE[density],
        className,
      )}
      {...rest}
    />
  )
}
