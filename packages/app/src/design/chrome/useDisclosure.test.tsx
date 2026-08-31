import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDisclosure } from './useDisclosure'

afterEach(cleanup)

/**
 * Tested through a trivial harness rather than through the FAB menu or the
 * emoji popover, deliberately: this is the logic that was wrong, and the
 * popover's own suite cannot exercise it without mounting a Radix popper —
 * measured at 11 SECONDS in this very file's first draft, which is exactly the
 * cost `system/primitives/__tests__/radixEnvironment.tsx` documents.
 */
function Harness({
  open,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (next: boolean) => void
}) {
  const [isOpen, setOpen] = useDisclosure(open, onOpenChange)
  return (
    <>
      <button type="button" onClick={() => setOpen(!isOpen)}>
        toggle
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        close
      </button>
      <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
    </>
  )
}

const state = () => screen.getByTestId('state').textContent

describe('with no caller holding the flag', () => {
  it('starts closed', () => {
    render(<Harness />)

    expect(state()).toBe('closed')
  })

  it('opens on the toggle', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }))

    expect(state()).toBe('open')
  })

  it('CLOSES on its own — the bug: the emoji popover stayed open after a pick', async () => {
    // Passing the caller's `undefined` straight down puts the underlying
    // primitive in ITS uncontrolled mode, where an `onOpenChange` aimed at a
    // caller that does not exist changes nothing at all.
    render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }))
    await userEvent.click(screen.getByRole('button', { name: 'close' }))

    expect(state()).toBe('closed')
  })

  it('still tells an observer what happened', async () => {
    const onOpenChange = vi.fn()
    render(<Harness onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(state()).toBe('open')
  })
})

describe('with a caller holding the flag', () => {
  it('shows what the caller says, not what it last did', async () => {
    const onOpenChange = vi.fn()
    render(<Harness open={false} onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
    // The caller has not moved, so neither has the component.
    expect(state()).toBe('closed')
  })

  it('follows the caller when it does move', () => {
    const { rerender } = render(<Harness open={false} />)
    expect(state()).toBe('closed')

    rerender(<Harness open />)
    expect(state()).toBe('open')
  })

  it('keeps no stale local copy to win an argument with later', async () => {
    // A component that wrote the local flag in controlled mode too would jump
    // back to that value the moment the caller stopped passing `open`.
    const { rerender } = render(<Harness open />)
    await userEvent.click(screen.getByRole('button', { name: 'close' }))

    rerender(<Harness />)

    expect(state()).toBe('closed')
  })
})
