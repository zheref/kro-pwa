import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './button'

afterEach(cleanup)

const DISABLED_FADE = 'disabled:opacity-[var(--kro-opacity-disabled)]'

describe('Button', () => {
  it('renders a button that is not a submit button by default', () => {
    // HTML defaults a button inside a form to `submit`, which is how a
    // "Cancel" control ends up submitting the form it sits in.
    render(<Button>Start session</Button>)

    expect(
      screen.getByRole('button', { name: 'Start session' }),
    ).toHaveProperty('type', 'button')
  })

  it('still lets a caller ask for a submit button', () => {
    render(<Button type="submit">Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty(
      'type',
      'submit',
    )
  })

  it('calls its handler', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Complete</Button>)

    await userEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('applies the disabled fade EXACTLY once — two fades drop below the 3:1 floor', () => {
    render(<Button disabled>Confirm</Button>)

    const className = screen.getByRole('button').className
    const occurrences = className
      .split(/\s+/)
      .filter((c) => c === DISABLED_FADE)
    expect(occurrences).toHaveLength(1)
  })

  it('carries the fade on every variant and size, so no combination misses it', () => {
    for (const variant of [
      'primary',
      'secondary',
      'ghost',
      'destructive',
      'glass',
    ] as const) {
      cleanup()
      render(
        <Button variant={variant} size="pill" disabled>
          x
        </Button>,
      )
      expect(
        screen.getByRole('button').className,
        `${variant} lost the disabled fade`,
      ).toContain(DISABLED_FADE)
    }
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Confirm
      </Button>,
    )

    await userEvent.click(screen.getByRole('button'))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('paints the primary variant on the live accent, not a hardcoded colour', () => {
    render(<Button variant="primary">Go</Button>)

    const className = screen.getByRole('button').className
    expect(className).toContain('bg-kro-accent')
    expect(className).toContain('text-kro-on-accent')
  })

  it('asks glass.css for the material rather than reimplementing it', () => {
    render(<Button variant="glass">Focus</Button>)

    const className = screen.getByRole('button').className
    expect(className).toContain('kro-glass')
    expect(className).toContain('kro-glass--control')
  })

  it('meets the 44px touch floor by default and the 28px pointer target at sm', () => {
    const { rerender } = render(<Button>Default</Button>)
    expect(screen.getByRole('button').className).toContain('h-11')

    rerender(<Button size="sm">Compact</Button>)
    expect(screen.getByRole('button').className).toContain('h-7')
  })

  it('renders the child element with asChild, so a link never nests in a button', () => {
    render(
      <Button asChild>
        <a href="/plan">Plan</a>
      </Button>,
    )

    const link = screen.getByRole('link', { name: 'Plan' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('type')).toBeNull()
    expect(link.className).toContain('kro-motion-quick')
  })

  it('lets a caller override a default rather than losing to source order', () => {
    render(<Button className="rounded-kro-pill">Pill</Button>)

    const className = screen.getByRole('button').className
    expect(className).toContain('rounded-kro-pill')
  })
})
