import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Link } from './Link'

afterEach(cleanup)

const DISABLED_FADE = 'disabled:opacity-[var(--kro-opacity-disabled)]'
const ANCHOR_FADE = 'opacity-[var(--kro-opacity-disabled)]'

describe('Link', () => {
  it('renders an accent underline link when given an href', () => {
    render(<Link href="/plan">Open the plan</Link>)

    const link = screen.getByRole('link', { name: 'Open the plan' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/plan')
    expect(link.getAttribute('data-slot')).toBe('link')
    const tokens = link.className.split(/\s+/)
    expect(tokens).toContain('underline')
    expect(tokens).toContain('text-kro-accent')
  })

  it('renders a button when there is no href', async () => {
    const onClick = vi.fn()
    render(<Link onClick={onClick}>Retry</Link>)

    const control = screen.getByRole('button', { name: 'Retry' })
    expect(control).toHaveProperty('type', 'button')
    expect(control.getAttribute('data-slot')).toBe('link')

    await userEvent.click(control)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled, and the fade lives on the control once', async () => {
    const onClick = vi.fn()
    render(
      <Link disabled onClick={onClick}>
        Retry
      </Link>,
    )

    const control = screen.getByRole('button', { name: 'Retry' })
    await userEvent.click(control)
    expect(onClick).not.toHaveBeenCalled()
    expect(control).toHaveProperty('disabled', true)
    expect(control.className).toContain('disabled:pointer-events-none')
    const fades = control.className
      .split(/\s+/)
      .filter((token) => token === DISABLED_FADE)
    expect(fades).toHaveLength(1)
  })

  it('fades a disabled href once, without a second wrapper dim', () => {
    render(
      <Link href="/plan" disabled>
        Open the plan
      </Link>,
    )

    const link = screen.getByRole('link', { name: 'Open the plan' })
    expect(link.getAttribute('aria-disabled')).toBe('true')
    expect(link.className).toContain('pointer-events-none')
    const fades = link.className
      .split(/\s+/)
      .filter((token) => token === ANCHOR_FADE)
    expect(fades).toHaveLength(1)
    expect(link.className).not.toContain(DISABLED_FADE)
  })

  it('paints subtle as secondary copy that underlines on hover', () => {
    render(
      <Link appearance="subtle" href="/plan">
        Learn more
      </Link>,
    )

    const tokens = screen.getByRole('link').className.split(/\s+/)
    expect(tokens).toContain('text-kro-fore-secondary')
    expect(tokens).toContain('hover:underline')
    expect(tokens).not.toContain('underline')
    expect(tokens).not.toContain('text-kro-accent')
  })

  it('sits inline with surrounding copy when asked', () => {
    render(
      <p>
        See the{' '}
        <Link href="/plan" inline>
          plan
        </Link>{' '}
        for today.
      </p>,
    )

    const tokens = screen.getByRole('link').className.split(/\s+/)
    expect(tokens).toContain('inline')
    expect(tokens).not.toContain('inline-flex')
  })
})
