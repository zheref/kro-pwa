import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GlassSurface } from './GlassSurface'

afterEach(cleanup)

describe('GlassSurface', () => {
  it('renders its children on the base material', () => {
    render(<GlassSurface data-testid="surface">Today</GlassSurface>)

    const surface = screen.getByTestId('surface')
    expect(surface.className).toContain('kro-glass')
    expect(surface.textContent).toBe('Today')
  })

  it('never puts backdrop-filter on the element itself — that IS the Safari fix', () => {
    // The material lives on ::before for every variant, fixed or not, so a
    // surface that later becomes sticky cannot silently acquire the WebKit
    // compositing bug. The element carries the class and nothing else.
    render(<GlassSurface fixed data-testid="surface" />)

    const surface = screen.getByTestId('surface')
    expect(surface.style.getPropertyValue('backdrop-filter')).toBe('')
    expect(surface.style.getPropertyValue('-webkit-backdrop-filter')).toBe('')
    expect(surface.className).toContain('kro-glass--fixed')
  })

  it('asks for the shallower blur on a small control', () => {
    render(<GlassSurface material="control" data-testid="surface" />)

    expect(screen.getByTestId('surface').className).toContain('kro-glass--control')
  })

  it('drops the ring for a hairline on a bar, and raises it once scrolled', () => {
    const { rerender } = render(
      <GlassSurface material="bar" data-testid="surface" />,
    )
    expect(screen.getByTestId('surface').className).not.toContain('is-scrolled')

    rerender(<GlassSurface material="bar" scrolled data-testid="surface" />)
    const surface = screen.getByTestId('surface')
    expect(surface.className).toContain('kro-glass--bar')
    expect(surface.className).toContain('is-scrolled')
  })

  it('ignores the scrolled flag on anything that is not a bar', () => {
    render(<GlassSurface material="surface" scrolled data-testid="surface" />)

    expect(screen.getByTestId('surface').className).not.toContain('is-scrolled')
  })

  it('adds hover and press response only when told it is a control', () => {
    const { rerender } = render(<GlassSurface data-testid="surface" />)
    expect(screen.getByTestId('surface').className).not.toContain(
      'kro-glass--interactive',
    )

    rerender(<GlassSurface interactive data-testid="surface" />)
    expect(screen.getByTestId('surface').className).toContain(
      'kro-glass--interactive',
    )
  })

  it('renders the element the caller asked for, so semantics stay with them', () => {
    render(
      <GlassSurface as="header" material="bar" fixed data-testid="bar">
        Kro
      </GlassSurface>,
    )

    expect(screen.getByTestId('bar').tagName).toBe('HEADER')
  })

  it('lets a caller add classes without losing the material', () => {
    render(<GlassSurface className="p-8" data-testid="surface" />)

    const className = screen.getByTestId('surface').className
    expect(className).toContain('kro-glass')
    expect(className).toContain('p-8')
  })

  it('forwards arbitrary DOM props — it is a material, not a wall', () => {
    render(<GlassSurface aria-label="Now playing" data-testid="surface" />)

    expect(screen.getByTestId('surface').getAttribute('aria-label')).toBe(
      'Now playing',
    )
  })
})
