import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installRadixEnvironment } from './__tests__/radixEnvironment'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

let teardown: () => void

beforeEach(() => {
  teardown = installRadixEnvironment()
})

afterEach(() => {
  cleanup()
  teardown()
})

function TriageDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog defaultOpen onOpenChange={onOpenChange}>
      <DialogTrigger>Open triage</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Triage inbox</DialogTitle>
          <DialogDescription>Three items are waiting.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button">Confirm</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('announces itself as a dialog with its title and description', () => {
    render(<TriageDialog />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(screen.getByText('Triage inbox')).toBeDefined()
    expect(screen.getByText('Three items are waiting.')).toBeDefined()
  })

  it('renders its panel on the glass material', () => {
    render(<TriageDialog />)

    expect(screen.getByRole('dialog').className).toContain('kro-glass')
  })

  /** Same fix, same reason as `sheet.test.tsx`'s own — see that file. */
  it('forces position:fixed inline — className alone loses to `.kro-glass`\'s unlayered CSS', () => {
    render(<TriageDialog />)

    expect(screen.getByRole('dialog').style.position).toBe('fixed')
  })

  it('offers a labelled close affordance rather than an unnamed glyph', () => {
    render(<TriageDialog />)

    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined()
  })

  it('closes on the close button', async () => {
    const onOpenChange = vi.fn()
    render(<TriageDialog onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on Escape — the dismissal a keyboard user reaches for first', async () => {
    const onOpenChange = vi.fn()
    render(<TriageDialog onOpenChange={onOpenChange} />)

    await userEvent.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('withholds the close affordance for a flow that must be completed', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent hideClose>
          <DialogTitle>Finish setting up</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('is not in the document until it is opened', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Triage inbox</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
