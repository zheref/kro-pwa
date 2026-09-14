import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Stepper } from './Stepper'

afterEach(cleanup)

describe('Stepper', () => {
  it('nudges session minutes up by the step and announces the value', async () => {
    const onValueChange = vi.fn()
    render(
      <Stepper
        label="Session minutes"
        defaultValue={25}
        step={5}
        min={5}
        max={90}
        onValueChange={onValueChange}
      />,
    )

    expect(screen.getByText('25').getAttribute('aria-live')).toBe('polite')
    await userEvent.click(screen.getByRole('button', { name: 'Increase' }))

    expect(screen.getByText('30')).toBeTruthy()
    expect(onValueChange).toHaveBeenCalledWith(30)
  })

  it('disables minus at the minimum so a session cannot go to zero minutes', async () => {
    const onValueChange = vi.fn()
    render(
      <Stepper
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
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('disables plus at the maximum and does not step past it', async () => {
    const onValueChange = vi.fn()
    render(
      <Stepper
        label="Reward points"
        defaultValue={50}
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
    expect(screen.getByText('50')).toBeTruthy()
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <Stepper label="Session minutes" defaultValue={25} />,
    )
    const group = document.querySelector('[data-slot="stepper"]')
    expect(group?.getAttribute('data-density')).toBe('compact')
    expect(
      screen.getByRole('button', { name: 'Increase' }).className,
    ).toContain('size-6')

    rerender(
      <Stepper
        label="Session minutes"
        defaultValue={25}
        density="comfortable"
      />,
    )
    expect(
      document
        .querySelector('[data-slot="stepper"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(
      screen.getByRole('button', { name: 'Increase' }).className,
    ).toContain('size-9')
  })

  it('stays controlled when a caller passes `value`', async () => {
    const onValueChange = vi.fn()
    render(
      <Stepper
        label="Session minutes"
        value={25}
        onValueChange={onValueChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Increase' }))

    expect(onValueChange).toHaveBeenCalledWith(26)
    expect(screen.getByText('25')).toBeTruthy()
  })
})
