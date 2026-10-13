import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TabletFrame } from '../TabletFrame'

afterEach(cleanup)

const props = {
  src: '/shot.png',
  alt: 'Kro on iPad with the sidebar open',
  width: 960,
  height: 1800,
}

describe('TabletFrame', () => {
  it('carries the alt text on the screenshot itself, not on the frame', () => {
    render(<TabletFrame {...props} />)
    const image = screen.getByRole('img', { name: props.alt })
    expect(image.tagName).toBe('IMG')
    expect(image.getAttribute('alt')).toBe(props.alt)
  })

  it('is an iPad at its logical size: 820 pt screen + 18 pt bezels, 820 x 1180 ratio', () => {
    const { container } = render(<TabletFrame {...props} />)
    const frame = container.querySelector('.kro-device') as HTMLElement
    expect(frame.className).toContain('kro-device--tablet')
    expect(frame.style.getPropertyValue('--kro-device-w')).toBe('856px')
    expect(frame.style.getPropertyValue('--kro-screen-ar')).toBe('820 / 1180')
  })

  it('scales the whole device and keeps the image box reserved', () => {
    const { container } = render(<TabletFrame {...props} scale={0.5} />)
    expect(
      (
        container.querySelector('.kro-device') as HTMLElement
      ).style.getPropertyValue('--kro-device-w'),
    ).toBe('428px')
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('width')).toBe('960')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('loads eagerly at high priority when asked', () => {
    const { container } = render(<TabletFrame {...props} priority />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('fetchpriority')).toBe('high')
  })
})
