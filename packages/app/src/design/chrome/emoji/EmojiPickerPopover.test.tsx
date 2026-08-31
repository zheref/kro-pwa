import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { EMOJI_POPOVER_SIZE, EmojiPickerPopover } from './EmojiPickerPopover'

afterEach(cleanup)

/**
 * ASSERTED CLOSED, DELIBERATELY.
 *
 * Mounting anything built on Radix's popper costs seconds of wall time under
 * jsdom — measured, in `system/primitives/__tests__/radixEnvironment.tsx`,
 * where it turned `make test` red. The design system's own Popover and
 * DropdownMenu suites take the same shape for the same reason: assert the
 * trigger contract here, and leave the open panel to the Storybook test-runner,
 * which drives a real browser where the mount is cheap and the placement is
 * worth asserting.
 *
 * So: the panel's contents are covered by `EmojiPicker.test.tsx` (which mounts
 * the grid directly), and this file covers the part that is this wrapper's own
 * — that the trigger is the caller's control, correctly described, and closed
 * until asked. The open/closed logic itself — the part that shipped broken and
 * was caught in review — lives in `useDisclosure` and is tested there, without
 * a popper anywhere near it.
 */

describe('EmojiPickerPopover', () => {
  it('renders the caller`s control as the trigger, not a button of its own', () => {
    render(
      <EmojiPickerPopover>
        <button type="button">📊</button>
      </EmojiPickerPopover>,
    )

    // `asChild`: one button, the caller's.
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button').textContent).toBe('📊')
  })

  it('starts closed, and says so', () => {
    render(
      <EmojiPickerPopover>
        <button type="button">📊</button>
      </EmojiPickerPopover>,
    )

    const trigger = screen.getByRole('button')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
  })

  it('draws no grid until it is opened, so 420 cells cost nothing when closed', () => {
    render(
      <EmojiPickerPopover>
        <button type="button">📊</button>
      </EmojiPickerPopover>,
    )

    expect(document.querySelector('[data-kro-emoji-picker]')).toBeNull()
  })

  it('can be driven by a caller that owns the open state', () => {
    render(
      <EmojiPickerPopover open={false} onOpenChange={() => {}}>
        <button type="button">📊</button>
      </EmojiPickerPopover>,
    )

    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })

  it('hands Radix a DEFINED open flag, which is what makes picking close it', () => {
    // The bug, and why the assertion is shaped this way: passing the caller's
    // `undefined` straight through puts Radix in ITS uncontrolled mode, where
    // an `onOpenChange(false)` after a pick changes nothing — the panel stayed
    // open. `useDisclosure` always supplies a value, so Radix is controlled in
    // both modes.
    //
    // Asserted as "closed, and it knows it is closed" rather than by opening
    // the panel: the round trip through the popper costs ELEVEN SECONDS under
    // jsdom (measured, in this file's first draft — see the header). The
    // behaviour itself is covered by `useDisclosure.test.tsx`, which is the
    // module that was actually wrong, and by the *In a popover* story.
    render(
      <EmojiPickerPopover>
        <button type="button">📊</button>
      </EmojiPickerPopover>,
    )

    expect(screen.getByRole('button').getAttribute('data-state')).toBe('closed')
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })

  it('is wide enough for seven full-size cells — canon`s 320 is not', () => {
    // The web cells are 44px touch targets rather than canon's 38pt ones, and
    // seven of those plus gaps and padding do not fit in 320.
    expect(EMOJI_POPOVER_SIZE.width).toBeGreaterThanOrEqual(7 * 44 + 6 * 4 + 24)
    expect(EMOJI_POPOVER_SIZE.height).toBe(360)
  })
})
