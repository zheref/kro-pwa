import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PhoneFrame } from '../PhoneFrame'

afterEach(cleanup)

const props = {
  src: '/shot.png',
  alt: 'A screenshot of the day',
  width: 300,
  height: 600,
}

describe('PhoneFrame', () => {
  it('carries the alt text on the screenshot itself, not on the frame', () => {
    render(<PhoneFrame {...props} />)
    const image = screen.getByRole('img', { name: props.alt })
    expect(image.tagName).toBe('IMG')
    expect(image.getAttribute('alt')).toBe(props.alt)
  })

  it('reserves the screenshot box and lazy-loads it', () => {
    const { container } = render(<PhoneFrame {...props} />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('width')).toBe('300')
    expect(img.getAttribute('height')).toBe('600')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('loads eagerly at high priority when asked', () => {
    const { container } = render(<PhoneFrame {...props} priority />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('fetchpriority')).toBe('high')
  })

  it('passes a className through next to the frame class', () => {
    render(<PhoneFrame {...props} className="extra" />)
    const frame = screen
      .getByRole('img', { name: props.alt })
      .closest('.kro-device') as HTMLElement
    expect(frame.className).toContain('kro-device--phone')
    expect(frame.className).toContain('extra')
  })
})

describe('PhoneFrame platforms and size', () => {
  const frameOf = (container: HTMLElement) =>
    container.querySelector('.kro-device') as HTMLElement

  it('draws an iPhone by default: Dynamic Island chrome, 390 pt screen + 11 pt bezels', () => {
    const { container } = render(<PhoneFrame {...props} />)
    const frame = frameOf(container)
    expect(frame.className).toContain('kro-device--ios')
    expect(frame.style.getPropertyValue('--kro-device-w')).toBe('412px')
    expect(frame.style.getPropertyValue('--kro-screen-ar')).toBe('390 / 844')
    expect(container.querySelector('.kro-device__cutout')).not.toBeNull()
  })

  it('draws an Android phone with its thinner bezel and its own screen ratio', () => {
    const { container } = render(<PhoneFrame {...props} platform="android" />)
    const frame = frameOf(container)
    expect(frame.className).toContain('kro-device--android')
    expect(frame.className).not.toContain('kro-device--ios')
    expect(frame.style.getPropertyValue('--kro-device-w')).toBe('426px')
    expect(frame.style.getPropertyValue('--kro-screen-ar')).toBe('412 / 892')
  })

  it('renders a half-scale iPhone at half its logical width', () => {
    const { container } = render(<PhoneFrame {...props} scale={0.5} />)
    expect(frameOf(container).style.getPropertyValue('--kro-device-w')).toBe(
      '206px',
    )
  })

  it('hides the cutout from assistive technology', () => {
    const { container } = render(<PhoneFrame {...props} />)
    expect(
      container
        .querySelector('.kro-device__cutout')
        ?.getAttribute('aria-hidden'),
    ).toBe('true')
  })
})
