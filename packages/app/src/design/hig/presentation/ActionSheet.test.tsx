import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installRadixEnvironment } from '../../system/primitives/__tests__/radixEnvironment'
import {
  ActionSheet,
  ActionSheetAction,
  ActionSheetContent,
  ActionSheetTitle,
} from './ActionSheet'

let teardown: () => void

beforeEach(() => {
  teardown = installRadixEnvironment()
})

afterEach(() => {
  cleanup()
  teardown()
})

function EndeavorSheet({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <ActionSheet defaultOpen onOpenChange={onOpenChange}>
      <ActionSheetContent>
        <ActionSheetTitle>Write the KroTokens port</ActionSheetTitle>
        <ActionSheetAction>Complete</ActionSheetAction>
        <ActionSheetAction>Reschedule</ActionSheetAction>
        <ActionSheetAction tone="destructive">
          Delete endeavor
        </ActionSheetAction>
        <ActionSheetAction tone="cancel">Cancel</ActionSheetAction>
      </ActionSheetContent>
    </ActionSheet>
  )
}

describe('ActionSheet', () => {
  it('rises as a dialog from the bottom edge', () => {
    render(<EndeavorSheet />)

    const sheet = screen.getByRole('dialog')
    expect(sheet.dataset.side).toBe('bottom')
    expect(screen.getByText('Write the KroTokens port')).toBeDefined()
  })

  it('withholds the dismiss-X — cancel is the way out', () => {
    render(<EndeavorSheet />)

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined()
  })

  it('paints destructive as danger AND a named label, cancel as secondary', () => {
    render(<EndeavorSheet />)

    const destroy = screen.getByRole('button', { name: 'Delete endeavor' })
    expect(destroy.className).toContain('text-kro-banner-danger')
    expect(destroy.className).toContain('h-7')
    expect(destroy.className).toContain('w-full')
    expect(destroy.getAttribute('data-tone')).toBe('destructive')

    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(cancel.getAttribute('data-tone')).toBe('cancel')
    expect(cancel.className).toContain('kro-glass')
  })

  it("keeps SheetContent's forced position:fixed", () => {
    render(<EndeavorSheet />)

    expect(screen.getByRole('dialog').style.position).toBe('fixed')
    expect(screen.getByRole('dialog').className).toContain('kro-glass')
  })

  it('still dismisses on Escape', async () => {
    const onOpenChange = vi.fn()
    render(<EndeavorSheet onOpenChange={onOpenChange} />)

    await userEvent.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('defaults to compact and grows for comfortable', () => {
    render(
      <ActionSheet defaultOpen>
        <ActionSheetContent>
          <ActionSheetTitle>Today</ActionSheetTitle>
          <ActionSheetAction>Complete</ActionSheetAction>
          <ActionSheetAction density="comfortable">
            Reschedule
          </ActionSheetAction>
        </ActionSheetContent>
      </ActionSheet>,
    )

    expect(
      screen
        .getByRole('button', { name: 'Complete' })
        .getAttribute('data-density'),
    ).toBe('compact')
    expect(
      screen.getByRole('button', { name: 'Complete' }).className,
    ).toContain('h-7')
    expect(
      screen
        .getByRole('button', { name: 'Reschedule' })
        .getAttribute('data-density'),
    ).toBe('comfortable')
    expect(
      screen.getByRole('button', { name: 'Reschedule' }).className,
    ).toContain('h-9')
  })
})
