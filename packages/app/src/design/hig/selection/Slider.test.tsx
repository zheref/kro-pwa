import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Slider } from './Slider'

afterEach(cleanup)

describe('Slider', () => {
  it('starts at the supplied session length and exposes a slider', () => {
    render(
      <Slider
        aria-label="Focus minutes"
        defaultValue={25}
        min={5}
        max={90}
        step={5}
      />,
    )

    const control = screen.getByRole<HTMLInputElement>('slider', {
      name: 'Focus minutes',
    })
    expect(control.value).toBe('25')
    expect(control.className).toContain('kro-hig-slider')
  })

  it('reports the new value when the thumb moves', () => {
    const onValueChange = vi.fn()
    render(
      <Slider
        aria-label="Focus minutes"
        defaultValue={25}
        min={5}
        max={90}
        onValueChange={onValueChange}
      />,
    )

    fireEvent.change(screen.getByRole('slider'), { target: { value: '40' } })

    expect(onValueChange).toHaveBeenCalledWith(40)
    expect(screen.getByRole<HTMLInputElement>('slider').value).toBe('40')
  })

  it('does not fire when disabled, and the fade lives on the range once', () => {
    const onValueChange = vi.fn()
    render(
      <Slider
        aria-label="Focus minutes"
        defaultValue={25}
        disabled
        onValueChange={onValueChange}
      />,
    )

    const control = screen.getByRole<HTMLInputElement>('slider')

    expect(onValueChange).not.toHaveBeenCalled()
    expect(control.disabled).toBe(true)
    expect(control.className).toContain('kro-hig-slider')
  })

  it('reads the current value next to the label when asked', () => {
    render(
      <Slider
        label="Reward points"
        defaultValue={12}
        showValue
        min={0}
        max={50}
      />,
    )

    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByRole('slider', { name: 'Reward points' })).toBeTruthy()
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <Slider aria-label="Focus minutes" defaultValue={25} />,
    )
    const control = screen.getByRole('slider')
    expect(control.getAttribute('data-density')).toBe('compact')
    expect(control.parentElement?.className).toContain('min-h-6')

    rerender(
      <Slider
        aria-label="Focus minutes"
        defaultValue={25}
        density="comfortable"
      />,
    )
    const comfortable = screen.getByRole('slider')
    expect(comfortable.getAttribute('data-density')).toBe('comfortable')
    expect(comfortable.parentElement?.className).toContain('min-h-9')
  })

  it('stays controlled when a caller passes `value`', () => {
    const onValueChange = vi.fn()
    render(
      <Slider
        aria-label="Focus minutes"
        value={25}
        onValueChange={onValueChange}
      />,
    )

    fireEvent.change(screen.getByRole('slider'), { target: { value: '40' } })

    expect(onValueChange).toHaveBeenCalledWith(40)
    expect(screen.getByRole<HTMLInputElement>('slider').value).toBe('25')
  })
})
