import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NavigationBar } from './NavigationBar'

afterEach(cleanup)

describe('NavigationBar', () => {
  it('titles the current screen in semibold foreground', () => {
    render(<NavigationBar title="My Day" />)

    expect(screen.getByText('My Day')).toBeTruthy()
    const bar = screen.getByRole('banner')
    expect(bar.className).toContain('kro-glass')
    expect(bar.className).toContain('kro-glass--bar')
  })

  it('defaults to a compact row and stays relative — never fixed', () => {
    render(<NavigationBar title="Plan" />)

    const bar = screen.getByRole('banner')
    expect(bar.style.position).toBe('relative')
    expect(bar.style.position).not.toBe('fixed')
    expect(bar.getAttribute('data-density')).toBe('compact')
    const row = bar.querySelector('.min-h-6')
    expect(row).not.toBeNull()
  })

  it('grows the row for comfortable density', () => {
    render(<NavigationBar title="Plan" density="comfortable" />)

    const bar = screen.getByRole('banner')
    expect(bar.getAttribute('data-density')).toBe('comfortable')
    expect(bar.querySelector('.min-h-9')).not.toBeNull()
  })

  it('hosts leading and trailing nodes without navigating', async () => {
    const onBack = vi.fn()
    const onInfo = vi.fn()
    render(
      <NavigationBar
        title="Write the KroTokens port"
        leading={
          <button type="button" onClick={onBack}>
            Back
          </button>
        }
        trailing={
          <button type="button" onClick={onInfo}>
            Info
          </button>
        }
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await userEvent.click(screen.getByRole('button', { name: 'Info' }))

    expect(onBack).toHaveBeenCalledOnce()
    expect(onInfo).toHaveBeenCalledOnce()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('places a large title below the bar when asked', () => {
    render(<NavigationBar title="My Day" large />)

    const heading = screen.getByRole('heading', { name: 'My Day' })
    expect(heading.tagName).toBe('H1')
    expect(heading.className).toContain('text-2xl')
    expect(heading.className).toContain('font-bold')
    const compact = screen.getByText('My Day', {
      selector: 'p',
    })
    expect(compact.className).toContain('sr-only')
  })
})
