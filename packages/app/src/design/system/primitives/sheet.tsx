import * as DialogPrimitive from '@radix-ui/react-dialog'
import { type VariantProps, cva } from 'class-variance-authority'
import { X } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../utils/cn'
import { DialogOverlay } from './dialog'

/**
 * Sheet — the mobile-idiom presentation of a dialog.
 *
 * Same Radix primitive as `Dialog` on purpose. The epic's idiom rule pairs a
 * mobile sheet with a desktop popover or dialog showing *the same content*
 * (Inbox, Visibility, Profile, Do notifications); sharing the primitive means
 * the shell child (#13) picks a presentation by width without either variant
 * re-implementing focus trapping, scroll locking or dismissal.
 *
 * A bottom sheet is the default because that is the edge a thumb reaches.
 */
const sheetVariants = cva(
  cn(
    'kro-glass fixed z-50 flex flex-col gap-kro-medium p-kro-large',
    'kro-motion-standard-spring transition-transform',
  ),
  {
    variants: {
      side: {
        bottom:
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-kro-surface rounded-b-none',
        top: 'inset-x-0 top-0 max-h-[85vh] rounded-b-kro-surface rounded-t-none',
        left: 'inset-y-0 left-0 w-3/4 max-w-sm rounded-r-kro-surface rounded-l-none',
        right: 'inset-y-0 right-0 w-3/4 max-w-sm rounded-l-kro-surface rounded-r-none',
      },
    },
    defaultVariants: { side: 'bottom' },
  },
)

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  readonly hideClose?: boolean
}

export function SheetContent({
  className,
  children,
  side,
  hideClose = false,
  ...rest
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        data-side={side ?? 'bottom'}
        className={cn(sheetVariants({ side }), className)}
        {...rest}
      >
        {/*
          The grabber. Decorative — it is not a control, and the sheet is
          dismissed by the close button, the overlay or Escape, all of which
          Radix already wires. Marking it aria-hidden keeps it out of the
          reading order rather than announcing a shape.
        */}
        <div
          aria-hidden="true"
          className="mx-auto h-1 w-10 shrink-0 rounded-kro-pill bg-kro-hairline"
        />
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
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
    </DialogPrimitive.Portal>
  )
}

export function SheetTitle({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-semibold text-kro-fore text-lg', className)}
      {...rest}
    />
  )
}

export function SheetDescription({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-kro-fore-secondary text-sm', className)}
      {...rest}
    />
  )
}

export { sheetVariants }
