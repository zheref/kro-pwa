import type { ReactNode } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../system/primitives/popover'
import { useDisclosure } from '../useDisclosure'
import type { EmojiCategory } from './emojiCategories'
import { EmojiPicker } from './EmojiPicker'

/**
 * The picker in a popover — the desktop presentation of the same grid.
 *
 * `EmojiPicker` is presentation-agnostic by canon's design ("callers wrap it in
 * whatever container fits"). This is the wrapper for the case `#15` names, and
 * it is thin on purpose: the popover primitive already owns the panel material,
 * the placement, the dismissal and the focus trap, so this file contributes a
 * size and a selection callback and nothing else.
 *
 * THE SIZE. Canon's previews frame the picker at 320x360. This asks for 360
 * wide because the web cells are full 44px touch targets rather than canon's
 * 38pt ones (see `EmojiPicker`), and seven of those plus the gaps and padding
 * do not fit in 320. The height is canon's.
 *
 * NOT IN THE SNAPSHOT SET, deliberately. Everything built on Radix's popper
 * costs seconds per mount under jsdom — measured, in
 * `system/primitives/__tests__/radixEnvironment.tsx` — which is why the design
 * system's own Popover and DropdownMenu are excluded from the Vitest snapshots
 * too. Its trigger contract is asserted closed, in `EmojiPickerPopover.test.tsx`,
 * and the open panel is a Storybook story.
 */

export interface EmojiPickerPopoverProps {
  /** The control that opens the picker. Rendered as the trigger itself. */
  readonly children: ReactNode
  readonly selection?: string
  /** Fires with the chosen glyph. The popover closes itself afterwards. */
  readonly onPick?: (emoji: string) => void
  readonly categories?: readonly EmojiCategory[]
  readonly open?: boolean
  readonly onOpenChange?: (open: boolean) => void
  readonly align?: 'start' | 'center' | 'end'
}

/** Wide enough for seven 44px cells, and canon's height. */
export const EMOJI_POPOVER_SIZE = { width: 360, height: 360 } as const

export function EmojiPickerPopover({
  children,
  selection,
  onPick,
  categories,
  open,
  onOpenChange,
  align = 'start',
}: EmojiPickerPopoverProps) {
  // Always a DEFINED `open` handed to Radix — see `useDisclosure`, and the bug
  // it names: `open={undefined}` puts Radix in its own uncontrolled mode, where
  // an `onOpenChange(false)` after a pick changes nothing and the panel stays
  // open.
  const [isOpen, setOpen] = useDisclosure(open, onOpenChange)

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        aria-label="Choose an emoji"
        // `p-0` because the grid brings its own padding and the pinned headers
        // have to reach the panel's edges to read as pinned rather than inset.
        className="p-0 overflow-hidden"
        style={{ width: EMOJI_POPOVER_SIZE.width, height: EMOJI_POPOVER_SIZE.height }}
      >
        <EmojiPicker
          selection={selection}
          categories={categories}
          onPick={(emoji) => {
            onPick?.(emoji)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
