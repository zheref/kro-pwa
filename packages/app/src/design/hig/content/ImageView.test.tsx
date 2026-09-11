import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ImageView } from './ImageView'

afterEach(cleanup)

const PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

describe('ImageView', () => {
  it('requires a spoken name and keeps a decorative frame silent', () => {
    const { rerender } = render(
      <ImageView src={PIXEL} alt="Cover for Write the port" />,
    )

    expect(
      screen.getByRole('img', { name: 'Cover for Write the port' }),
    ).toBeTruthy()

    rerender(<ImageView src={PIXEL} alt="ignored" decorative />)

    const decorative = document.querySelector('img')
    expect(decorative?.getAttribute('alt')).toBe('')
  })

  it('shows the caption and the requested aspect', () => {
    render(
      <ImageView
        src={PIXEL}
        alt="Session capture"
        aspect="16/9"
        caption="Captured after the morning block"
      />,
    )

    expect(screen.getByText('Captured after the morning block')).toBeTruthy()
    expect(screen.getByRole('img').getAttribute('style')).toContain('16/9')
  })

  it('swaps to the fallback when the image errors, without inventing a network URL', () => {
    render(
      <ImageView
        src={PIXEL}
        alt="Session capture"
        fallback={<span>📌</span>}
      />,
    )

    fireEvent.error(screen.getByRole('img'))

    expect(screen.getByText('📌')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('treats an empty src as already failed so stories need no network', () => {
    render(
      <ImageView
        src=""
        alt="Endeavor cover"
        aspect="4/3"
        fallback={<span>🎯</span>}
      />,
    )

    expect(screen.getByText('🎯')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
    expect(
      document
        .querySelector('[data-slot="image-view-fallback"]')
        ?.getAttribute('style'),
    ).toContain('4/3')
  })

  it('defaults to compact type and grows for comfortable', () => {
    const { rerender } = render(
      <ImageView src={PIXEL} alt="Session capture" caption="Morning block" />,
    )

    expect(document.querySelector('figure')?.getAttribute('data-density')).toBe(
      'compact',
    )
    expect(screen.getByText('Morning block').className).toContain('text-xs')

    rerender(
      <ImageView
        src={PIXEL}
        alt="Session capture"
        caption="Morning block"
        density="comfortable"
      />,
    )
    expect(document.querySelector('figure')?.getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(screen.getByText('Morning block').className).toContain('text-sm')
  })
})
