import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorWell } from './ColorWell'

afterEach(cleanup)

describe('ColorWell', () => {
  it('paints the swatch with the caller-supplied kro colour, never a hidden default', () => {
    render(<ColorWell aria-label="Endeavor accent" defaultValue="#5e6472" />)

    const control = screen.getByLabelText<HTMLInputElement>('Endeavor accent')
    expect(control.getAttribute('type')).toBe('color')
    expect(control.value).toBe('#5e6472')
    const swatch = document.querySelector('[data-slot="color-well-swatch"]')
    // jsdom serialises `#5e6472` (kro, light) as rgb(94, 100, 114).
    expect(swatch?.getAttribute('style') ?? '').toContain('rgb(94, 100, 114)')
  })

  it('reports the new hex when the platform picker changes', () => {
    const onValueChange = vi.fn()
    render(
      <ColorWell
        aria-label="Endeavor accent"
        defaultValue="#5e6472"
        onValueChange={onValueChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Endeavor accent'), {
      target: { value: '#b0b9d4' },
    })

    expect(onValueChange).toHaveBeenCalledWith('#b0b9d4')
    expect(
      screen.getByLabelText<HTMLInputElement>('Endeavor accent').value,
    ).toBe('#b0b9d4')
  })

  it('does not fire when disabled, and the fade lives on the swatch once', () => {
    const onValueChange = vi.fn()
    render(
      <ColorWell
        aria-label="Endeavor accent"
        defaultValue="#5e6472"
        disabled
        onValueChange={onValueChange}
      />,
    )

    const control = screen.getByLabelText<HTMLInputElement>('Endeavor accent')

    expect(onValueChange).not.toHaveBeenCalled()
    expect(control.disabled).toBe(true)
    const swatch = document.querySelector('[data-slot="color-well-swatch"]')
    expect(swatch?.className).toContain('opacity-[var(--kro-opacity-disabled)]')
    expect(control.className).toContain('opacity-0')
    expect(control.className).not.toContain(
      'opacity-[var(--kro-opacity-disabled)]',
    )
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <ColorWell aria-label="Endeavor accent" defaultValue="#5e6472" />,
    )
    const swatch = document.querySelector('[data-slot="color-well-swatch"]')
    expect(swatch?.className).toContain('size-6')
    expect(swatch?.parentElement?.getAttribute('data-density')).toBe('compact')

    rerender(
      <ColorWell
        aria-label="Endeavor accent"
        defaultValue="#5e6472"
        density="comfortable"
      />,
    )
    const comfortable = document.querySelector(
      '[data-slot="color-well-swatch"]',
    )
    expect(comfortable?.className).toContain('size-9')
    expect(comfortable?.parentElement?.getAttribute('data-density')).toBe(
      'comfortable',
    )
  })

  it('stays controlled when a caller passes `value`', () => {
    const onValueChange = vi.fn()
    render(
      <ColorWell
        aria-label="Endeavor accent"
        value="#5e6472"
        onValueChange={onValueChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Endeavor accent'), {
      target: { value: '#b0b9d4' },
    })

    expect(onValueChange).toHaveBeenCalledWith('#b0b9d4')
    expect(
      screen.getByLabelText<HTMLInputElement>('Endeavor accent').value,
    ).toBe('#5e6472')
  })
})
