import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installRadixEnvironment } from './__tests__/radixEnvironment'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet'

let teardown: () => void

beforeEach(() => {
  teardown = installRadixEnvironment()
})

afterEach(() => {
  cleanup()
  teardown()
})

function InboxSheet(props: {
  side?: 'top' | 'bottom' | 'left' | 'right'
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Sheet defaultOpen onOpenChange={props.onOpenChange}>
      <SheetContent side={props.side}>
        <SheetTitle>Inbox</SheetTitle>
        <SheetDescription>Three items to triage.</SheetDescription>
      </SheetContent>
    </Sheet>
  )
}

describe('Sheet', () => {
  it('is the same dialog primitive, so it announces itself as one', () => {
    render(<InboxSheet />)

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('Inbox')).toBeDefined()
  })

  it('comes from the bottom by default — the edge a thumb reaches', () => {
    render(<InboxSheet />)

    expect(screen.getByRole('dialog').dataset.side).toBe('bottom')
  })

  it('supports the other three edges for the desktop drawers', () => {
    for (const side of ['top', 'left', 'right'] as const) {
      cleanup()
      render(<InboxSheet side={side} />)
      expect(screen.getByRole('dialog').dataset.side).toBe(side)
    }
  })

  it('renders on the glass material', () => {
    render(<InboxSheet />)

    expect(screen.getByRole('dialog').className).toContain('kro-glass')
  })

  it('keeps the grabber out of the reading order — it is a shape, not a control', () => {
    render(<InboxSheet />)

    const grabber = screen
      .getByRole('dialog')
      .querySelector('[aria-hidden="true"][class*="rounded-kro-pill"]')
    expect(grabber).not.toBeNull()
    expect(screen.queryByRole('separator')).toBeNull()
  })

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn()
    render(<InboxSheet onOpenChange={onOpenChange} />)

    await userEvent.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on the labelled close button', async () => {
    const onOpenChange = vi.fn()
    render(<InboxSheet onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
