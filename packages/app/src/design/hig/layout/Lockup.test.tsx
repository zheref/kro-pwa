import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Lockup } from './Lockup'

afterEach(cleanup)

describe('Lockup', () => {
  it('pairs a leading slot with a title and subtitle', () => {
    render(
      <Lockup
        title="Inbox triage"
        subtitle="Plan · Task"
        leading={<span>📋</span>}
      />,
    )

    expect(screen.getByText('Inbox triage')).toBeTruthy()
    expect(screen.getByText('Plan · Task')).toBeTruthy()
    expect(document.querySelector('[data-slot="lockup"]')?.className).toContain(
      'min-h-6',
    )
    expect(document.querySelector('[data-slot="lockup"]')?.className).toContain(
      'gap-kro-small',
    )
  })

  it('is a static row when there is no click handler', () => {
    render(<Lockup title="Morning run" leading={<span>🏃</span>} />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(document.querySelector('[data-slot="lockup"]')?.tagName).toBe('DIV')
  })

  it('makes the whole row the target when onClick is set', async () => {
    const onClick = vi.fn()
    render(
      <Lockup
        title="Weekly review"
        leading={<span>📅</span>}
        onClick={onClick}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Weekly review' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <Lockup title="Inbox triage" leading={<span>📋</span>} />,
    )

    const row = document.querySelector('[data-slot="lockup"]')
    expect(row?.getAttribute('data-density')).toBe('compact')
    expect(row?.className).toContain('min-h-6')

    rerender(
      <Lockup
        title="Inbox triage"
        leading={<span>📋</span>}
        density="comfortable"
      />,
    )
    const comfortable = document.querySelector('[data-slot="lockup"]')
    expect(comfortable?.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable?.className).toContain('min-h-9')
  })
})
