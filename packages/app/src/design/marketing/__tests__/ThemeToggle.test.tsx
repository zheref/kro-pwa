import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from '../ThemeToggle'

afterEach(cleanup)

describe('ThemeToggle', () => {
  it('reports dark mode as pressed and light as not', () => {
    const { rerender } = render(
      <ThemeToggle value="light" onToggle={() => undefined} />,
    )
    expect(
      screen
        .getByRole('button', { name: 'Dark mode' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
    rerender(<ThemeToggle value="dark" onToggle={() => undefined} />)
    expect(
      screen
        .getByRole('button', { name: 'Dark mode' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('asks for the opposite theme and changes nothing itself', () => {
    const onToggle = vi.fn()
    render(<ThemeToggle value="light" onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  })

  it('asks for light when the value is dark', () => {
    const onToggle = vi.fn()
    render(<ThemeToggle value="dark" onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith('light')
  })

  it('takes a custom accessible name and keeps both icons decorative', () => {
    const { container } = render(
      <ThemeToggle
        value="light"
        onToggle={() => undefined}
        label="Modo oscuro"
      />,
    )
    expect(screen.getByRole('button', { name: 'Modo oscuro' })).toBeTruthy()
    const icons = container.querySelectorAll('svg')
    expect(icons).toHaveLength(2)
    for (const icon of icons)
      expect(icon.getAttribute('aria-hidden')).toBe('true')
  })
})
