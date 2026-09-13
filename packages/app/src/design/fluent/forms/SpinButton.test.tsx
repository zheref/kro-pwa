import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpinButton } from './SpinButton'

afterEach(cleanup)

describe('SpinButton', () => {
  it('nudges session minutes up by the step through an editable field', async () => {
    const onValueChange = vi.fn()
    render(
      <SpinButton
        label="Session minutes"
        defaultValue={25}
        step={5}
        min={5}
        max={90}
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByLabelText<HTMLInputElement>('Session minutes')
    expect(field.getAttribute('type')).toBe('number')
    expect(field.value).toBe('25')
    expect(document.querySelector('[data-slot="spin-button"]')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(onValueChange).toHaveBeenCalledWith(30)
    expect(field.value).toBe('30')

    await userEvent.click(screen.getByRole('button', { name: 'Decrease' }))
    expect(onValueChange).toHaveBeenLastCalledWith(25)
    expect(field.value).toBe('25')
  })

  it('disables minus at min and plus at max so the bound is the signal', async () => {
    const onValueChange = vi.fn()
    const { rerender } = render(
      <SpinButton
        label="Session minutes"
        defaultValue={5}
        step={5}
        min={5}
        max={90}
        onValueChange={onValueChange}
      />,
    )

    const minus = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Decrease',
    })
    expect(minus.disabled).toBe(true)
    await userEvent.click(minus)
    expect(onValueChange).not.toHaveBeenCalled()

    rerender(
      <SpinButton
        label="Reward points"
        value={50}
        min={0}
        max={50}
        onValueChange={onValueChange}
      />,
    )
    const plus = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Increase',
    })
    expect(plus.disabled).toBe(true)
    await userEvent.click(plus)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('accepts typing in the field and stays controlled when asked', async () => {
    const onValueChange = vi.fn()
    const { rerender } = render(
      <SpinButton
        label="Session minutes"
        defaultValue={25}
        min={5}
        max={90}
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByLabelText<HTMLInputElement>('Session minutes')
    fireEvent.change(field, { target: { value: '40' } })
    expect(onValueChange).toHaveBeenLastCalledWith(40)
    expect(field.value).toBe('40')

    rerender(
      <SpinButton
        label="Session minutes"
        value={25}
        onValueChange={onValueChange}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(onValueChange).toHaveBeenLastCalledWith(26)
    expect(
      screen.getByLabelText<HTMLInputElement>('Session minutes').value,
    ).toBe('25')
  })

  it('does not wrap the buttons in a second fade when disabled', async () => {
    const onValueChange = vi.fn()
    render(
      <SpinButton
        label="Session minutes"
        defaultValue={25}
        disabled
        onValueChange={onValueChange}
      />,
    )

    const root = document.querySelector('[data-slot="spin-button"]')
    expect(root?.className).not.toContain(
      'opacity-[var(--kro-opacity-disabled)]',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(
      screen.getByLabelText<HTMLInputElement>('Session minutes').disabled,
    ).toBe(true)
  })

  it('maps Fluent sizes onto Kro density', () => {
    const { rerender } = render(
      <SpinButton label="Minutes" defaultValue={25} size="small" />,
    )
    expect(
      document
        .querySelector('[data-slot="spin-button"]')
        ?.getAttribute('data-density'),
    ).toBe('compact')
    expect(
      screen.getByRole('button', { name: 'Increase' }).className,
    ).toContain('size-6')

    rerender(<SpinButton label="Minutes" defaultValue={25} size="large" />)
    expect(
      document
        .querySelector('[data-slot="spin-button"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(
      screen.getByRole('button', { name: 'Increase' }).className,
    ).toContain('size-9')
  })

  it('clamps typed values to the range and ignores empty input', () => {
    const onValueChange = vi.fn()
    render(
      <SpinButton
        defaultValue={25}
        min={5}
        max={90}
        onValueChange={onValueChange}
      />,
    )

    const field = document.querySelector('input')
    expect(field).toBeTruthy()
    if (field === null) return

    fireEvent.change(field, { target: { value: '999' } })
    expect(onValueChange).toHaveBeenCalledWith(90)

    fireEvent.change(field, { target: { value: '' } })
    expect(onValueChange).toHaveBeenLastCalledWith(90)
  })
})
