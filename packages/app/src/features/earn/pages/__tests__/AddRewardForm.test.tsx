import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { blankEarnRewardDraft } from '../../EarnFeature'
import { AddRewardForm } from '../AddRewardForm'

afterEach(cleanup)

const baseDraft = { ...blankEarnRewardDraft, pointsRequired: 100 }

describe('AddRewardForm', () => {
  it('disables Add on a blank title', () => {
    render(
      <AddRewardForm
        isOpen
        draft={baseDraft}
        presentation="sheet"
        trigger={<button type="button">FAB</button>}
        onChangeTitle={() => {}}
        onChangeGlyph={() => {}}
        onChangePoints={() => {}}
        onChangeNotes={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Add' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('enables Add once a title is present', () => {
    render(
      <AddRewardForm
        isOpen
        draft={{ ...baseDraft, title: 'Movie night' }}
        presentation="sheet"
        trigger={<button type="button">FAB</button>}
        onChangeTitle={() => {}}
        onChangeGlyph={() => {}}
        onChangePoints={() => {}}
        onChangeNotes={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Add' }).hasAttribute('disabled'),
    ).toBe(false)
  })

  it('dispatches title/glyph/notes changes as the user types', () => {
    const onChangeTitle = vi.fn()
    const onChangeGlyph = vi.fn()
    const onChangeNotes = vi.fn()
    render(
      <AddRewardForm
        isOpen
        draft={baseDraft}
        presentation="sheet"
        trigger={<button type="button">FAB</button>}
        onChangeTitle={onChangeTitle}
        onChangeGlyph={onChangeGlyph}
        onChangePoints={() => {}}
        onChangeNotes={onChangeNotes}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('What do you want to earn?'), {
      target: { value: 'Boba' },
    })
    expect(onChangeTitle).toHaveBeenCalledWith('Boba')

    fireEvent.change(screen.getByLabelText('Emoji'), {
      target: { value: '🧋' },
    })
    expect(onChangeGlyph).toHaveBeenCalledWith('🧋')

    fireEvent.change(screen.getByLabelText('Notes (optional)'), {
      target: { value: 'Treat myself' },
    })
    expect(onChangeNotes).toHaveBeenCalledWith('Treat myself')
  })

  it('steps the point cost by 50 in either direction, clamped at zero', () => {
    const onChangePoints = vi.fn()
    render(
      <AddRewardForm
        isOpen
        draft={{ ...baseDraft, pointsRequired: 0 }}
        presentation="sheet"
        trigger={<button type="button">FAB</button>}
        onChangeTitle={() => {}}
        onChangeGlyph={() => {}}
        onChangePoints={onChangePoints}
        onChangeNotes={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Fewer points' }))
    expect(onChangePoints).toHaveBeenCalledWith(0)

    fireEvent.click(screen.getByRole('button', { name: 'More points' }))
    expect(onChangePoints).toHaveBeenCalledWith(50)
  })

  it('confirms on submit and cancels on Cancel', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <AddRewardForm
        isOpen
        draft={{ ...baseDraft, title: 'Movie night' }}
        presentation="sheet"
        trigger={<button type="button">FAB</button>}
        onChangeTitle={() => {}}
        onChangeGlyph={() => {}}
        onChangePoints={() => {}}
        onChangeNotes={() => {}}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  /**
   * Closed, deliberately: mounting an OPEN `PopoverContent` under jsdom costs
   * seconds per mount and trips Vitest's own worker RPC watchdog (measured in
   * `design/system/primitives/__tests__/radixEnvironment.tsx`; reproduced by
   * this file's own first draft in CI). This asserts the trigger anchors the
   * popover (its own `PopoverTrigger`, correctly `aria-haspopup="dialog"`)
   * without paying that cost — the form's actual on-screen content in the
   * desktop idiom is `EarnFragment.stories.tsx`'s `AddRewardDesktop` story
   * (a real browser) and this PR's real-browser screenshots, exactly the
   * split `popover.test.tsx` already draws.
   */
  it('anchors the popover presentation to its own trigger, not opened by default', () => {
    render(
      <AddRewardForm
        isOpen={false}
        draft={baseDraft}
        presentation="popover"
        trigger={<button type="button">FAB</button>}
        onChangeTitle={() => {}}
        onChangeGlyph={() => {}}
        onChangePoints={() => {}}
        onChangeNotes={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'FAB' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('[data-slot="popover-content"]')).toBeNull()
  })
})
