import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DetailBackdrop } from './DetailBackdrop'

afterEach(cleanup)

describe('DetailBackdrop', () => {
  it('is invisible to assistive technology — it carries no information', () => {
    render(<DetailBackdrop />)

    expect(
      screen.getByTestId('detail-backdrop').getAttribute('aria-hidden'),
    ).toBe('true')
  })

  it('paints the page field, not a header slab', () => {
    render(<DetailBackdrop />)

    expect(screen.getByTestId('detail-backdrop').className).toContain(
      'kro-detail-backdrop',
    )
    expect(screen.getByTestId('detail-backdrop').className).not.toContain(
      'kro-gradient-backdrop',
    )
  })

  it('pins to the viewport only when asked', () => {
    const { rerender } = render(<DetailBackdrop />)
    expect(screen.getByTestId('detail-backdrop').className).not.toContain(
      'kro-detail-backdrop--fixed',
    )

    rerender(<DetailBackdrop fixed />)
    expect(screen.getByTestId('detail-backdrop').className).toContain(
      'kro-detail-backdrop--fixed',
    )
  })

  it('lets a caller add classes without losing the field', () => {
    render(<DetailBackdrop className="inset-0" />)

    const className = screen.getByTestId('detail-backdrop').className
    expect(className).toContain('kro-detail-backdrop')
    expect(className).toContain('inset-0')
  })
})
