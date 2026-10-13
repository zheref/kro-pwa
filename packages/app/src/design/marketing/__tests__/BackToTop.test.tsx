import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackToTop } from '../BackToTop'
import { stubReducedMotion } from './testEnv'

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

beforeEach(() => {
  Object.defineProperty(window, 'innerHeight', {
    value: 1000,
    configurable: true,
  })
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('BackToTop', () => {
  it('is hidden from focus and assistive tech at the top of the page', () => {
    const { container } = render(<BackToTop />)
    const button = container.querySelector('button') as HTMLButtonElement
    expect(screen.queryByRole('button')).toBeNull()
    expect(button.getAttribute('aria-hidden')).toBe('true')
    expect(button.tabIndex).toBe(-1)
    expect(button.className).not.toContain('is-visible')
  })

  it('appears once scrolled past 0.8 viewport heights, and not before', () => {
    render(<BackToTop />)
    scrollTo(799)
    expect(screen.queryByRole('button', { name: 'Back to top' })).toBeNull()
    scrollTo(801)
    const button = screen.getByRole('button', { name: 'Back to top' })
    expect(button.className).toContain('is-visible')
    expect(button.tabIndex).toBe(0)
  })

  it('scrolls to the top smoothly', () => {
    render(<BackToTop />)
    scrollTo(2000)
    fireEvent.click(screen.getByRole('button', { name: 'Back to top' }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('scrolls instantly under reduced motion', () => {
    stubReducedMotion(true)
    render(<BackToTop label="Volver arriba" />)
    scrollTo(2000)
    fireEvent.click(screen.getByRole('button', { name: 'Volver arriba' }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })
})
