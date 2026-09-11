import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { TextView } from './TextView'

afterEach(cleanup)

const DISABLED_FADE = 'disabled:opacity-[var(--kro-opacity-disabled)]'

describe('TextView', () => {
  it('accepts typing under a visible label', async () => {
    render(<TextView label="Session notes" />)

    const field = screen.getByLabelText<HTMLTextAreaElement>('Session notes')
    await userEvent.type(field, 'Shipped the port.')

    expect(field.value).toBe('Shipped the port.')
  })

  it('uses the same recessed field recipe as Input', () => {
    render(<TextView aria-label="Notes" />)

    const className = screen.getByLabelText('Notes').className
    expect(className).toContain('bg-kro-back-inner')
    expect(className).toContain('rounded-kro-field')
    expect(className).toContain('border-kro-hairline')
    expect(className).toContain('min-h-[88px]')
    expect(className).toContain('placeholder:text-kro-fore-secondary')
    expect(className).toContain('focus-visible:border-kro-accent')
    expect(className).toContain('focus-visible:shadow-[var(--kro-ring)]')
  })

  it('applies the disabled fade exactly once and stops accepting input', async () => {
    render(<TextView aria-label="Notes" disabled />)

    const field = screen.getByLabelText<HTMLTextAreaElement>('Notes')
    await userEvent.type(field, 'nope')

    expect(field.value).toBe('')
    const fades = field.className
      .split(/\s+/)
      .filter((token) => token === DISABLED_FADE)
    expect(fades).toHaveLength(1)
  })

  it('marks an invalid field with the danger role rather than colour alone', () => {
    render(<TextView aria-label="Notes" aria-invalid />)

    const field = screen.getByLabelText('Notes')
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.className).toContain('aria-invalid:border-kro-banner-danger')
  })

  it('defaults to compact type and grows for comfortable', () => {
    const { rerender } = render(<TextView aria-label="Notes" />)

    const field = screen.getByLabelText('Notes')
    expect(field.getAttribute('data-density')).toBe('compact')
    expect(field.className).toContain('text-xs')

    rerender(<TextView aria-label="Notes" density="comfortable" />)
    expect(screen.getByLabelText('Notes').getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(screen.getByLabelText('Notes').className).toContain('text-sm')
  })
})
