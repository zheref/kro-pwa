import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'

afterEach(cleanup)

describe('Checkbox', () => {
  it('starts unchecked and keeps the native checkbox role', () => {
    render(<Checkbox aria-label="Show archived" />)

    const control = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'Show archived',
    })
    expect(control.checked).toBe(false)
    expect(control.className).toContain('kro-hig-check')
  })

  it('checks when pressed and reports the new value', async () => {
    const onCheckedChange = vi.fn()
    render(
      <Checkbox aria-label="Show archived" onCheckedChange={onCheckedChange} />,
    )

    await userEvent.click(screen.getByRole('checkbox'))

    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(true)
    expect(onCheckedChange).toHaveBeenCalledOnce()
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('does not fire when disabled, and the fade lives on the input once', async () => {
    const onCheckedChange = vi.fn()
    render(
      <Checkbox
        aria-label="Show archived"
        disabled
        onCheckedChange={onCheckedChange}
      />,
    )

    const control = screen.getByRole<HTMLInputElement>('checkbox')
    await userEvent.click(control)

    expect(onCheckedChange).not.toHaveBeenCalled()
    expect(control.checked).toBe(false)
    expect(control.disabled).toBe(true)
    expect(control.className).toContain('kro-hig-check')
  })

  it('honours a visible label without losing the accessible name', async () => {
    render(<Checkbox label="Complete with session" />)

    expect(
      screen.getByRole('checkbox', { name: 'Complete with session' }),
    ).toBeTruthy()
    await userEvent.click(screen.getByText('Complete with session'))
    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(true)
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(<Checkbox aria-label="Show archived" />)
    const control = screen.getByRole('checkbox')
    expect(control.getAttribute('data-density')).toBe('compact')
    expect(control.parentElement?.className).toContain('min-h-6')

    rerender(<Checkbox aria-label="Show archived" density="comfortable" />)
    const comfortable = screen.getByRole('checkbox')
    expect(comfortable.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable.parentElement?.className).toContain('min-h-9')
  })

  it('stays controlled when a caller passes `checked`', async () => {
    const onCheckedChange = vi.fn()
    render(
      <Checkbox
        aria-label="Show archived"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    )

    await userEvent.click(screen.getByRole('checkbox'))

    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(false)
  })
})
