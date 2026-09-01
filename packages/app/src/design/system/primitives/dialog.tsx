import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../utils/cn'

/**
 * Dialog — the desktop-idiom modal, on Radix.
 *
 * The mobile counterpart is `Sheet`, which is the same Radix primitive with a
 * different presentation. The epic's idiom rule is "sheets on mobile,
 * popovers on desktop for the same content"; keeping both on one primitive is
 * what lets the shell child (#13) swap them by width without re-implementing
 * focus management, scroll locking or the escape key.
 *
 * The panel is KroGlass. The overlay is not: a scrim's whole job is to dim
 * what is behind it, so blurring it as well costs a compositor layer for no
 * legibility gain.
 */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export function DialogOverlay({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 z-50 bg-black/40', className)}
      {...rest}
    />
  )
}

export interface DialogContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Hide the built-in close affordance for a flow that must be completed. */
  readonly hideClose?: boolean
}

export function DialogContent({
  className,
  children,
  hideClose = false,
  style,
  ...rest
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'kro-glass fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'grid w-full max-w-[560px] gap-kro-medium p-kro-large',
          'rounded-kro-surface',
          className,
        )}
        // `position: fixed` FORCED inline — see `sheet.tsx`'s `SheetContent`
        // for the full explanation: `.kro-glass` is deliberately UNLAYERED
        // CSS, which beats every `@layer`-wrapped Tailwind utility
        // (including `.fixed`) regardless of specificity or source order, so
        // the className alone silently loses this fight and the dialog
        // renders un-positioned. `KC-IS-#28`. `position` is spread LAST,
        // after any caller `style`, so a caller's own `style` prop can never
        // reintroduce the bug (Copilot round 1).
        style={{ ...style, position: 'fixed' }}
        {...rest}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              'absolute top-kro-medium right-kro-medium',
              'inline-flex size-11 items-center justify-center rounded-kro-small',
              'text-kro-fore-secondary hover:text-kro-fore',
              'outline-none focus-visible:shadow-[var(--kro-ring)]',
            )}
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogHeader({
  className,
  ...rest
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-kro-tiny', className)}
      {...rest}
    />
  )
}

export function DialogFooter({
  className,
  ...rest
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-kro-small sm:flex-row sm:justify-end',
        className,
      )}
      {...rest}
    />
  )
}

export function DialogTitle({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-semibold text-kro-fore text-lg', className)}
      {...rest}
    />
  )
}

export function DialogDescription({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-kro-fore-secondary text-sm', className)}
      {...rest}
    />
  )
}
