import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  Button,
  buttonSizeForDensity,
  controlDensity,
  controlMinSizeVar,
  iconButtonSizeForDensity,
} from './button'

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
      'outline',
      'subtle',
      'transparent',
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

  it('paints the primary variant as accent-tinted glass, not a flat fill', () => {
    render(<Button variant="primary">Go</Button>)

    const className = screen.getByRole('button').className
    expect(className).toContain('kro-glass')
    expect(className).toContain('kro-glass--control')
    expect(className).toContain('kro-glass--accent')
    expect(className).toContain('text-kro-on-accent')
  })

  it('paints secondary and glass as the same untinted control material', () => {
    render(<Button variant="secondary">Reschedule</Button>)
    const secondary = screen.getByRole('button').className
    expect(secondary).toContain('kro-glass--control')
    expect(secondary).not.toContain('kro-glass--accent')

    cleanup()
    render(<Button variant="glass">Focus</Button>)
    const glass = screen.getByRole('button').className
    expect(glass).toContain('kro-glass')
    expect(glass).toContain('kro-glass--control')
  })

  it('paints destructive as danger-tinted glass', () => {
    render(<Button variant="destructive">Delete</Button>)

    const className = screen.getByRole('button').className
    expect(className).toContain('kro-glass--danger')
  })

  it('defaults to compact (h-6, text-xs) and uses h-9 for comfortable', () => {
    const { rerender } = render(<Button>Default</Button>)
    const compact = screen.getByRole('button').className
    expect(compact).toContain('h-6')
    expect(compact).toContain('text-xs')

    rerender(<Button size="md">Comfortable</Button>)
    const comfortable = screen.getByRole('button').className
    expect(comfortable).toContain('h-9')
    expect(comfortable).toContain('text-sm')
    expect(comfortable).not.toContain('h-11')
  })

  it('maps pointer vs touch onto those two sizes', () => {
    expect(controlDensity(false)).toBe('compact')
    expect(controlDensity(true)).toBe('comfortable')
    expect(buttonSizeForDensity('compact')).toBe('sm')
    expect(buttonSizeForDensity('comfortable')).toBe('md')
  })

  it('maps icon-only buttons the same way', () => {
    expect(iconButtonSizeForDensity('compact')).toBe('icon-sm')
    expect(iconButtonSizeForDensity('comfortable')).toBe('icon')
  })

  it('names the token floor each density must not fall below', () => {
    expect(controlMinSizeVar('compact')).toBe(
      'var(--kro-size-min-pointer-target)',
    )
    expect(controlMinSizeVar('comfortable')).toBe(
      'var(--kro-size-min-touch-target)',
    )
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

  it('paints Fluent outline as a hairline, not a filled glass control', () => {
    render(<Button variant="outline">Outline</Button>)

    const className = screen.getByRole('button').className
    expect(className).toContain('border-kro-hairline')
    expect(className).not.toContain('kro-glass--accent')
  })

  it('honours Fluent circular and square shapes', () => {
    const { rerender } = render(<Button shape="circular">Go</Button>)
    expect(screen.getByRole('button').getAttribute('data-shape')).toBe(
      'circular',
    )
    expect(screen.getByRole('button').className).toContain('rounded-kro-pill')

    rerender(<Button shape="square">Go</Button>)
    expect(screen.getByRole('button').getAttribute('data-shape')).toBe('square')
    expect(screen.getByRole('button').className).toContain('rounded-none')
  })
})
