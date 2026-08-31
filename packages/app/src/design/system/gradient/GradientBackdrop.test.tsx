import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GradientBackdrop, GradientContent } from './GradientBackdrop'

afterEach(cleanup)

describe('GradientBackdrop', () => {
  it('renders the indigoGrape slab by default', () => {
    render(<GradientBackdrop data-testid="slab" />)

    const slab = screen.getByTestId('slab')
    expect(slab.className).toContain('kro-gradient-backdrop')
    expect(slab.dataset.gradientVariant).toBe('indigoGrape')
  })

  it('is invisible to assistive technology — it carries no information', () => {
    render(<GradientBackdrop data-testid="slab" />)

    expect(screen.getByTestId('slab').getAttribute('aria-hidden')).toBe('true')
  })

  it('takes its height as a custom property, so it never pushes layout', () => {
    render(<GradientBackdrop height="320px" data-testid="slab" />)

    expect(
      screen.getByTestId('slab').style.getPropertyValue('--kro-gradient-height'),
    ).toBe('320px')
  })

  it('pins to the viewport only when asked — the mobile shell wants that, a detail page does not', () => {
    const { rerender } = render(<GradientBackdrop data-testid="slab" />)
    expect(screen.getByTestId('slab').className).not.toContain(
      'kro-gradient-backdrop--fixed',
    )

    rerender(<GradientBackdrop fixed data-testid="slab" />)
    expect(screen.getByTestId('slab').className).toContain(
      'kro-gradient-backdrop--fixed',
    )
  })

  it('fades into the page surface by default and only stops when asked', () => {
    const { rerender } = render(<GradientBackdrop data-testid="slab" />)
    expect(screen.getByTestId('slab').className).not.toContain(
      'kro-gradient-backdrop--hard',
    )

    rerender(<GradientBackdrop hardEdge data-testid="slab" />)
    expect(screen.getByTestId('slab').className).toContain(
      'kro-gradient-backdrop--hard',
    )
  })

  it('keeps a caller’s inline style alongside its own custom property', () => {
    render(<GradientBackdrop style={{ opacity: 0.5 }} data-testid="slab" />)

    const slab = screen.getByTestId('slab')
    expect(slab.style.opacity).toBe('0.5')
    expect(slab.style.getPropertyValue('--kro-gradient-height')).toBe('220px')
  })

  it('does not name a `style` prop for the variant, which would shadow the DOM one', () => {
    // Regression guard for the API, not the render: SwiftUI calls this
    // parameter `style`, and copying that name here would collide with the
    // inline-style object every DOM element already has.
    render(<GradientBackdrop variant="indigoGrape" data-testid="slab" />)

    expect(screen.getByTestId('slab').dataset.gradientVariant).toBe('indigoGrape')
  })
})

describe('GradientContent', () => {
  it('raises content above the slab so a surface never has to remember to', () => {
    render(<GradientContent data-testid="content">Good morning</GradientContent>)

    const content = screen.getByTestId('content')
    expect(content.className).toContain('kro-gradient-content')
    expect(content.textContent).toBe('Good morning')
  })

  it('accepts extra classes without losing the stacking class', () => {
    render(<GradientContent className="px-6" data-testid="content" />)

    const className = screen.getByTestId('content').className
    expect(className).toContain('kro-gradient-content')
    expect(className).toContain('px-6')
  })

  it('renders nothing of its own when it has no children', () => {
    render(<GradientContent data-testid="content" />)

    expect(screen.getByTestId('content').childNodes).toHaveLength(0)
  })
})
