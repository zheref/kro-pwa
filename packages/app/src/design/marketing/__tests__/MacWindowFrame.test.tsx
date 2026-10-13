import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MacWindowFrame } from '../MacWindowFrame'

afterEach(cleanup)

const props = {
  src: '/shot.png',
  alt: 'A screenshot of the day',
  width: 300,
  height: 600,
}

describe('MacWindowFrame', () => {
  it('names itself for assistive tech with the alt text', () => {
    render(<MacWindowFrame {...props} />)
    expect(screen.getByRole('img', { name: props.alt })).toBeTruthy()
  })

  it('reserves the screenshot box and lazy-loads it', () => {
    const { container } = render(<MacWindowFrame {...props} />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('width')).toBe('300')
    expect(img.getAttribute('height')).toBe('600')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('loads eagerly at high priority when asked', () => {
    const { container } = render(<MacWindowFrame {...props} priority />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('fetchpriority')).toBe('high')
  })

  it('passes a className through next to the frame class', () => {
    render(<MacWindowFrame {...props} className="extra" />)
    const frame = screen.getByRole('img', { name: props.alt })
    expect(frame.className).toContain('kro-device--mac')
    expect(frame.className).toContain('extra')
  })
})

describe('MacWindowFrame chrome', () => {
  it('draws three decorative traffic lights', () => {
    const { container } = render(<MacWindowFrame {...props} />)
    expect(container.querySelectorAll('.kro-device__light')).toHaveLength(3)
    expect(
      container
        .querySelector('.kro-device__lights')
        ?.getAttribute('aria-hidden'),
    ).toBe('true')
  })

  it('shows the title only when given one', () => {
    const { container, rerender } = render(<MacWindowFrame {...props} />)
    expect(container.querySelector('.kro-device__title')).toBeNull()
    rerender(<MacWindowFrame {...props} title="Kro" />)
    expect(container.querySelector('.kro-device__title')?.textContent).toBe(
      'Kro',
    )
  })
})
