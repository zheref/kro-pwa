import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Input } from './input'

afterEach(cleanup)

describe('Input', () => {
  it('accepts typing', async () => {
    render(<Input aria-label="Endeavor title" />)

    await userEvent.type(screen.getByLabelText('Endeavor title'), 'Write the port')

    expect(screen.getByLabelText<HTMLInputElement>('Endeavor title').value).toBe(
      'Write the port',
    )
  })

  it('sits on the recessed field surface, one step in from the card', () => {
    render(<Input aria-label="Title" />)

    expect(screen.getByLabelText('Title').className).toContain('bg-kro-back-inner')
  })

  it('always draws a border, because a fill-only field vanishes on a dark card', () => {
    render(<Input aria-label="Title" />)

    const className = screen.getByLabelText('Title').className
    expect(className).toContain('border')
    expect(className).toContain('border-kro-hairline')
  })

  it('meets the 44px minimum so a one-line field is still a comfortable target', () => {
    render(<Input aria-label="Title" />)

    expect(screen.getByLabelText('Title').className).toContain('h-11')
  })

  it('applies the disabled fade exactly once and stops accepting input', async () => {
    render(<Input aria-label="Title" disabled />)

    const field = screen.getByLabelText<HTMLInputElement>('Title')
    await userEvent.type(field, 'nope')

    expect(field.value).toBe('')
    const fades = field.className
      .split(/\s+/)
      .filter((c) => c === 'disabled:opacity-[var(--kro-opacity-disabled)]')
    expect(fades).toHaveLength(1)
  })

  it('marks an invalid field with the danger role rather than colour alone', () => {
    render(<Input aria-label="Title" aria-invalid />)

    const field = screen.getByLabelText('Title')
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.className).toContain('aria-invalid:border-kro-banner-danger')
  })

  it('forwards the input type', () => {
    render(<Input aria-label="When" type="date" />)

    expect(screen.getByLabelText('When').getAttribute('type')).toBe('date')
  })
})
