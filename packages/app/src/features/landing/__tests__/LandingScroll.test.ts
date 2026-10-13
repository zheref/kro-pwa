import { afterEach, describe, expect, it, vi } from 'vitest'
import { scrollToSection } from '../LandingScroll'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const mount = () => {
  document.body.innerHTML =
    '<section id="early-access"><input name="email" /></section>'
  const target = document.getElementById('early-access') as HTMLElement
  target.scrollIntoView = vi.fn()
  return target
}

describe('scrollToSection', () => {
  it('scrolls the section into view smoothly by default', () => {
    const target = mount()
    scrollToSection('early-access')
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('jumps instantly under reduced motion', () => {
    const target = mount()
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    scrollToSection('early-access')
    vi.unstubAllGlobals()
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
  })

  it('moves focus to the selector inside, without scrolling again', () => {
    mount()
    const input = document.querySelector('input') as HTMLInputElement
    const focus = vi.spyOn(input, 'focus')
    scrollToSection('early-access', 'input[name="email"]')
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(document.activeElement).toBe(input)
  })

  it('is a no-op for a missing id', () => {
    expect(() => scrollToSection('nope', 'input')).not.toThrow()
  })
})
