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
  it('names itself for assistive tech with the alt text', () => {
    render(<WatchFrame {...props} />)
    expect(screen.getByRole('img', { name: props.alt })).toBeTruthy()
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
    const frame = screen.getByRole('img', { name: props.alt })
    expect(frame.className).toContain('kro-device--watch')
    expect(frame.className).toContain('extra')
  })
})
