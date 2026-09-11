import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Panel } from './Panel'

afterEach(cleanup)

describe('Panel', () => {
  it('titles an inspector pane on content glass', () => {
    render(
      <Panel title="Endeavor properties">
        <div>Kind · Task</div>
      </Panel>,
    )

    expect(
      screen.getByRole('heading', { name: 'Endeavor properties' }),
    ).toBeTruthy()
    expect(screen.getByText('Kind · Task')).toBeTruthy()
    const pane = screen
      .getByText('Endeavor properties')
      .closest('[data-slot="panel"]')
    expect(pane?.className).toContain('kro-glass')
    expect(pane?.className).toContain('rounded-kro-surface')
  })

  it('defaults to 320 wide and is not a dialog', () => {
    render(
      <Panel title="Endeavor properties">
        <div>When · Today</div>
      </Panel>,
    )

    const pane = screen
      .getByText('Endeavor properties')
      .closest('[data-slot="panel"]')
    expect(pane).toBeInstanceOf(HTMLElement)
    expect((pane as HTMLElement).style.width).toBe('320px')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('offers a labelled close that only calls back — not a modal dismiss', async () => {
    const onClose = vi.fn()
    render(
      <Panel title="Endeavor properties" onClose={onClose}>
        <div>Status · Pending</div>
      </Panel>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('heading', { name: 'Endeavor properties' }),
    ).toBeTruthy()
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <Panel title="Endeavor properties" onClose={() => {}}>
        <div>Kind · Task</div>
      </Panel>,
    )

    const pane = screen
      .getByText('Endeavor properties')
      .closest('[data-slot="panel"]')
    expect(pane?.getAttribute('data-density')).toBe('compact')
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain(
      'size-6',
    )

    rerender(
      <Panel
        title="Endeavor properties"
        onClose={() => {}}
        density="comfortable"
      >
        <div>Kind · Task</div>
      </Panel>,
    )
    expect(
      screen
        .getByText('Endeavor properties')
        .closest('[data-slot="panel"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain(
      'size-9',
    )
  })
})
