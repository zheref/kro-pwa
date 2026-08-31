/**
 * The provider marks.
 *
 * What matters about a brand mark is that it is drawn as the brand specifies
 * and that it never becomes the button's accessible name — the wordmark beside
 * it already is. These pin both, plus Google's requirement that the G keeps its
 * four colours rather than taking the app's palette.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AppleMark, GoogleMark } from '../ProviderMarks'

afterEach(cleanup)

describe('the Apple mark', () => {
  it('draws an SVG rather than a font glyph', () => {
    render(<AppleMark />)
    expect(screen.getByTestId('apple-mark').tagName.toLowerCase()).toBe('svg')
  })

  it('takes the button colour, as Apple monochrome mark requires', () => {
    render(<AppleMark />)
    expect(screen.getByTestId('apple-mark').getAttribute('fill')).toBe(
      'currentColor',
    )
  })

  it('is hidden from assistive technology — the wordmark is the name', () => {
    render(<AppleMark />)
    expect(screen.getByTestId('apple-mark').getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('honours a requested size', () => {
    render(<AppleMark size={32} />)
    expect(screen.getByTestId('apple-mark').getAttribute('width')).toBe('32')
  })
})

describe('the Google mark', () => {
  it('draws the four brand colours, never a themed fill', () => {
    render(<GoogleMark />)

    const fills = Array.from(
      screen.getByTestId('google-mark').querySelectorAll('path'),
    ).map((path) => path.getAttribute('fill'))

    expect(fills).toEqual(['#4285F4', '#34A853', '#FBBC05', '#EA4335'])
  })

  it('is hidden from assistive technology — the wordmark is the name', () => {
    render(<GoogleMark />)
    expect(screen.getByTestId('google-mark').getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('honours a requested size', () => {
    render(<GoogleMark size={24} />)
    expect(screen.getByTestId('google-mark').getAttribute('height')).toBe('24')
  })
})
