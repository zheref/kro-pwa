import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlassCta } from '../GlassCta'

afterEach(cleanup)

const primary = { label: 'Get Kro', href: '#get' }

describe('GlassCta', () => {
  it('renders the title as a heading and the primary action as a link', () => {
    render(<GlassCta title="Make tomorrow calmer" primary={primary} />)
    expect(
      screen.getByRole('heading', { name: 'Make tomorrow calmer' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Get Kro' }).getAttribute('href'),
    ).toBe('#get')
  })

  it('shows the eyebrow, lede and secondary action only when given', () => {
    const { rerender } = render(<GlassCta title="t" primary={primary} />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    rerender(
      <GlassCta
        eyebrow="Start"
        title="t"
        lede="Free."
        primary={primary}
        secondary={{ label: 'Web app', href: '/my-day' }}
      />,
    )
    expect(screen.getByText('Start')).toBeTruthy()
    expect(screen.getByText('Free.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Web app' })).toBeTruthy()
  })

  it('calls the action handlers', () => {
    const onPrimary = vi.fn()
    const onSecondary = vi.fn()
    render(
      <GlassCta
        title="t"
        primary={{ ...primary, onClick: onPrimary }}
        secondary={{ label: 'More', href: '#more', onClick: onSecondary }}
      />,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Get Kro' }))
    fireEvent.click(screen.getByRole('link', { name: 'More' }))
    expect(onPrimary).toHaveBeenCalledTimes(1)
    expect(onSecondary).toHaveBeenCalledTimes(1)
  })

  it('draws two decorative glow blobs and renders children', () => {
    const { container } = render(
      <GlassCta title="t" primary={primary}>
        <small>iOS 18</small>
      </GlassCta>,
    )
    const blobs = container.querySelectorAll('.kro-glow-blob')
    expect(blobs).toHaveLength(2)
    for (const blob of blobs)
      expect(blob.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('iOS 18')).toBeTruthy()
  })
})
