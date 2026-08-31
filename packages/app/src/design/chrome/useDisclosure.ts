import { useCallback, useState } from 'react'

/**
 * Open/closed state that works whether or not the caller owns it.
 *
 * Two components in this kit take an optional `open`/`onOpenChange` pair — the
 * FAB menu and the emoji popover — and both got the same thing wrong in the
 * same way, so the resolution lives here once.
 *
 * THE BUG THIS EXISTS TO PREVENT. The obvious implementation passes the
 * caller's `open` straight through and calls `onOpenChange?.(next)` to close.
 * When `open` is `undefined` that is a no-op twice over: there is no caller
 * holding the flag, and an underlying primitive handed `open={undefined}`
 * (Radix, for one) switches to its OWN uncontrolled mode, where an
 * `onOpenChange` callback changes nothing. The panel opens and never closes.
 * `EmojiPickerPopover` shipped exactly that.
 *
 * The fix is to always hold a local flag, use it whenever the caller has not
 * supplied one, and always hand a DEFINED value down — so the primitive is
 * controlled in both modes and there is only ever one source of truth.
 */
export function useDisclosure(
  open: boolean | undefined,
  onOpenChange?: (next: boolean) => void,
): readonly [boolean, (next: boolean) => void] {
  const [uncontrolled, setUncontrolled] = useState(false)
  const isOpen = open ?? uncontrolled

  const setOpen = useCallback(
    (next: boolean) => {
      // Only when the caller is NOT holding the flag. Writing it in controlled
      // mode too would leave a stale local copy that wins the next time the
      // caller stops passing `open`.
      if (open === undefined) setUncontrolled(next)
      // Always announced, in both modes: a controlled caller needs it to
      // update, and an uncontrolled one may still want to observe.
      onOpenChange?.(next)
    },
    [open, onOpenChange],
  )

  return [isOpen, setOpen] as const
}
