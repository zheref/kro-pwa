import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { List, ListRow, ListSection } from './List'

afterEach(cleanup)

describe('List', () => {
  it('groups rows in an absolute card with a section caption', () => {
    render(
      <List>
        <ListSection header="Do" footer="Today's sessions">
          <ListRow title="Inbox triage" subtitle="Plan" />
          <ListRow title="Deep work" />
        </ListSection>
      </List>,
    )

    const list = document.querySelector('[data-slot="list"]')
    expect(list?.className).toContain('bg-kro-absolute')
    expect(list?.className).toContain('rounded-kro-card')
    expect(screen.getByText('Do')).toBeTruthy()
    expect(screen.getByText("Today's sessions")).toBeTruthy()
    expect(screen.getByText('Inbox triage')).toBeTruthy()
    expect(screen.getByText('Plan')).toBeTruthy()
  })

  it('marks a selected row with a check and aria-current, not colour alone', () => {
    render(
      <List>
        <ListRow title="Weekly review" selected trailing="Earn" />
      </List>,
    )

    const row = document.querySelector('[data-slot="list-row"]')
    expect(row?.getAttribute('aria-current')).toBe('true')
    expect(document.querySelector('[data-slot="list-row-check"]')).toBeTruthy()
    expect(screen.getByText('Weekly review')).toBeTruthy()
  })

  it('does not fire when disabled, and the fade lives on the row once', async () => {
    const onClick = vi.fn()
    render(
      <List>
        <ListRow title="Archive endeavor" disabled onClick={onClick} />
      </List>,
    )

    const row = screen.getByRole('button', { name: 'Archive endeavor' })
    await userEvent.click(row)

    expect(onClick).not.toHaveBeenCalled()
    const fade = 'opacity-[var(--kro-opacity-disabled)]'
    expect(row.className.split(/\s+/).filter((c) => c === fade)).toHaveLength(1)
  })

  it('calls onClick on a tappable row', async () => {
    const onClick = vi.fn()
    render(
      <List>
        <ListRow title="Start session" onClick={onClick} />
      </List>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Start session' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <List>
        <ListRow title="Inbox triage" />
      </List>,
    )

    const row = document.querySelector('[data-slot="list-row"]')
    expect(row?.getAttribute('data-density')).toBe('compact')
    expect(row?.className).toContain('min-h-6')

    rerender(
      <List>
        <ListRow title="Inbox triage" density="comfortable" />
      </List>,
    )
    const comfortable = document.querySelector('[data-slot="list-row"]')
    expect(comfortable?.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable?.className).toContain('min-h-9')
  })
})
