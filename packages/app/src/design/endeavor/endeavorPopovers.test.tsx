import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DeferPopover,
  DeleteConfirmationPopover,
  MarkCompletePopover,
  defaultDeferTarget,
  localInputValue,
  parseLocalInput,
} from './endeavorPopovers'

afterEach(cleanup)

const NOW = new Date(2026, 3, 15, 14, 0, 0)

describe('localInputValue', () => {
  it('prints the LOCAL wall clock, not UTC — the bug a UTC-pinned CI never sees', () => {
    expect(localInputValue(new Date(2026, 3, 15, 9, 5))).toBe('2026-04-15T09:05')
  })

  it('pads every field, because the input refuses a ragged value', () => {
    expect(localInputValue(new Date(2026, 0, 2, 3, 4))).toBe('2026-01-02T03:04')
  })

  it('round-trips through parseLocalInput to the same wall-clock minute', () => {
    const parsed = parseLocalInput(localInputValue(NOW))
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getHours()).toBe(14)
    expect(parsed?.getMinutes()).toBe(0)
  })

  it('reports null for the empty and half-typed values the input allows', () => {
    expect(parseLocalInput('')).toBeNull()
    expect(parseLocalInput('2026-04-')).toBeNull()
  })
})

describe('defaultDeferTarget', () => {
  it('pushes an existing due time out by a day, as canon does', () => {
    const due = new Date(2026, 3, 15, 17, 0)
    expect(defaultDeferTarget(due, NOW).getTime()).toBe(due.getTime() + 86_400_000)
  })

  it('falls back to tomorrow at 9 AM when there is no due time', () => {
    const target = defaultDeferTarget(null, NOW)

    expect(target.getDate()).toBe(16)
    expect(target.getHours()).toBe(9)
    expect(target.getMinutes()).toBe(0)
  })

  it('rolls into the next month correctly on the last day', () => {
    const target = defaultDeferTarget(null, new Date(2026, 3, 30, 23, 30))
    expect(target.getMonth()).toBe(4)
    expect(target.getDate()).toBe(1)
  })
})

describe('MarkCompletePopover — the BACKDATE surface', () => {
  it('opens on the moment it was given, so the common case is one tap', () => {
    render(
      <MarkCompletePopover
        initialDate={NOW}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    )

    expect((screen.getByLabelText('Completed at') as HTMLInputElement).value).toBe(
      '2026-04-15T14:00',
    )
  })

  it('confirms with the EDITED date — the whole point of the surface', async () => {
    const onConfirm = vi.fn()
    render(
      <MarkCompletePopover initialDate={NOW} onConfirm={onConfirm} onCancel={() => undefined} />,
    )

    const input = screen.getByLabelText('Completed at')
    await userEvent.clear(input)
    await userEvent.type(input, '2026-04-13T09:30')
    await userEvent.click(screen.getByRole('button', { name: /Mark/ }))

    expect(onConfirm).toHaveBeenCalledOnce()
    const [completedAt] = onConfirm.mock.calls[0] as [Date]
    expect(completedAt.getDate()).toBe(13)
    expect(completedAt.getHours()).toBe(9)
  })

  it('cancels without completing anything', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <MarkCompletePopover initialDate={NOW} onConfirm={onConfirm} onCancel={onCancel} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('refuses to confirm an unparseable value rather than sending an Invalid Date', async () => {
    const onConfirm = vi.fn()
    render(
      <MarkCompletePopover initialDate={NOW} onConfirm={onConfirm} onCancel={() => undefined} />,
    )

    await userEvent.clear(screen.getByLabelText('Completed at'))

    expect(screen.getByRole('button', { name: /Mark/ })).toHaveProperty('disabled', true)
  })

  it('re-seeds when re-presented, so yesterday’s edit does not persist', () => {
    const { rerender } = render(
      <MarkCompletePopover initialDate={NOW} onConfirm={() => undefined} onCancel={() => undefined} />,
    )

    rerender(
      <MarkCompletePopover
        initialDate={new Date(2026, 3, 16, 8, 0)}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    )

    expect((screen.getByLabelText('Completed at') as HTMLInputElement).value).toBe(
      '2026-04-16T08:00',
    )
  })
})

describe('DeferPopover', () => {
  it('confirms the chosen target', async () => {
    const onConfirm = vi.fn()
    render(<DeferPopover initialTarget={NOW} onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('button', { name: 'Defer' }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('offers Skip only where canon does — from the overflow route', () => {
    const { rerender } = render(<DeferPopover initialTarget={NOW} onConfirm={() => undefined} />)
    expect(screen.queryByRole('button', { name: /Skip/ })).toBeNull()

    rerender(
      <DeferPopover initialTarget={NOW} onConfirm={() => undefined} onSkip={() => undefined} />,
    )
    expect(screen.getByRole('button', { name: /Skip/ })).not.toBeNull()
  })

  it('raises Skip without also deferring', async () => {
    const onConfirm = vi.fn()
    const onSkip = vi.fn()
    render(<DeferPopover initialTarget={NOW} onConfirm={onConfirm} onSkip={onSkip} />)

    await userEvent.click(screen.getByRole('button', { name: /Skip/ }))

    expect(onSkip).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('DeleteConfirmationPopover', () => {
  it('names what is about to be deleted', () => {
    render(
      <DeleteConfirmationPopover
        title="Prepare presentation slides"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    )

    expect(screen.getByText('Delete "Prepare presentation slides"?')).not.toBeNull()
  })

  it('says the deletion reaches every source, because it does', () => {
    render(
      <DeleteConfirmationPopover title="x" onConfirm={() => undefined} onCancel={() => undefined} />,
    )

    expect(screen.getByText(/permanently removed from all\s+sources/)).not.toBeNull()
  })

  it('confirms and cancels independently', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <DeleteConfirmationPopover title="x" onConfirm={onConfirm} onCancel={onCancel} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Cancel/ }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /Delete/ }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
