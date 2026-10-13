import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { WatchFrame } from '../WatchFrame'

afterEach(cleanup)

const props = {
  src: '/shot.png',
  alt: 'A screenshot of the day',
  width: 300,
  height: 600,
}

describe('WatchFrame', () => {
  it('carries the alt text on the screenshot itself, not on the frame', () => {
    render(<WatchFrame {...props} />)
    const image = screen.getByRole('img', { name: props.alt })
    expect(image.tagName).toBe('IMG')
    expect(image.getAttribute('alt')).toBe(props.alt)
  })

  it('reserves the screenshot box and lazy-loads it', () => {
    const { container } = render(<WatchFrame {...props} />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('width')).toBe('300')
    expect(img.getAttribute('height')).toBe('600')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('loads eagerly at high priority when asked', () => {
    const { container } = render(<WatchFrame {...props} priority />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('fetchpriority')).toBe('high')
  })

  it('passes a className through next to the frame class', () => {
    render(<WatchFrame {...props} className="extra" />)
    const frame = screen
      .getByRole('img', { name: props.alt })
      .closest('.kro-device') as HTMLElement
    expect(frame.className).toContain('kro-device--watch')
    expect(frame.className).toContain('extra')
  })
})

describe('WatchFrame size', () => {
  it('is a 45 mm watch at its logical size: 198 pt screen + 16 pt bezels', () => {
    const { container } = render(<WatchFrame {...props} />)
    const frame = container.querySelector('.kro-device') as HTMLElement
    expect(frame.style.getPropertyValue('--kro-device-w')).toBe('230px')
    expect(frame.style.getPropertyValue('--kro-screen-ar')).toBe('198 / 242')
  })

  it('scales the case and the screen together', () => {
    const { container } = render(<WatchFrame {...props} scale={1.5} />)
    expect(
      (
        container.querySelector('.kro-device') as HTMLElement
      ).style.getPropertyValue('--kro-device-w'),
    ).toBe('345px')
  })
})
