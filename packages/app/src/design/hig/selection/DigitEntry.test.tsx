import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DigitEntry } from './DigitEntry'

afterEach(cleanup)

describe('DigitEntry', () => {
  it('collects a four-digit session PIN through one hidden field', async () => {
    const onValueChange = vi.fn()
    render(
      <DigitEntry aria-label="Session PIN" onValueChange={onValueChange} />,
    )

    const field = screen.getByLabelText<HTMLInputElement>('Session PIN')
    expect(field.getAttribute('inputmode')).toBe('numeric')
    expect(field.getAttribute('autocomplete')).toBe('one-time-code')
    expect(field.getAttribute('maxlength')).toBe('4')
    expect(field.className).toContain('opacity-0')

    await userEvent.type(field, '2580')

    expect(onValueChange).toHaveBeenLastCalledWith('2580')
    expect(field.value).toBe('2580')
    const cells = document.querySelectorAll('[data-slot="digit-cell"]')
    expect(cells).toHaveLength(4)
    expect(cells[0]?.textContent).toBe('2')
    expect(cells[3]?.textContent).toBe('0')
  })

  it('rejects letters and stops at the length so a PIN cannot overflow', async () => {
    const onValueChange = vi.fn()
    render(
      <DigitEntry
        aria-label="Session PIN"
        length={4}
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByLabelText<HTMLInputElement>('Session PIN')
    await userEvent.type(field, '12ab34')

    expect(field.value).toBe('1234')
    expect(onValueChange).toHaveBeenLastCalledWith('1234')
  })

  it('masks the cells with dots without changing the value the caller gets', async () => {
    const onValueChange = vi.fn()
    render(
      <DigitEntry aria-label="Unlock PIN" mask onValueChange={onValueChange} />,
    )

    await userEvent.type(screen.getByLabelText('Unlock PIN'), '19')

    expect(onValueChange).toHaveBeenLastCalledWith('19')
    const cells = document.querySelectorAll('[data-slot="digit-cell"]')
    expect(cells[0]?.textContent).toBe('•')
    expect(cells[1]?.textContent).toBe('•')
    expect(cells[2]?.textContent).toBe('')
  })

  it('defaults to compact cells and grows for comfortable', () => {
    const { rerender } = render(<DigitEntry aria-label="Session PIN" />)
    const root = document.querySelector('[data-slot="digit-entry"]')
    expect(root?.getAttribute('data-density')).toBe('compact')
    expect(
      document.querySelector('[data-slot="digit-cell"]')?.className,
    ).toContain('size-6')

    rerender(<DigitEntry aria-label="Session PIN" density="comfortable" />)
    expect(
      document
        .querySelector('[data-slot="digit-entry"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(
      document.querySelector('[data-slot="digit-cell"]')?.className,
    ).toContain('size-9')
  })

  it('does not accept digits when disabled', async () => {
    const onValueChange = vi.fn()
    render(
      <DigitEntry
        aria-label="Session PIN"
        disabled
        onValueChange={onValueChange}
      />,
    )

    await userEvent.type(screen.getByLabelText('Session PIN'), '1234')

    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText<HTMLInputElement>('Session PIN').value).toBe(
      '',
    )
  })
})
