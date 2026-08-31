import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CHROME_LAYOUT, toastLiftAbovePill } from '../layout/chromeLayout'
import { ActiveToastLayer } from './ActiveToastLayer'
import { resetActiveToastSequence, toActiveToast } from './activeToast'

beforeEach(resetActiveToastSequence)
afterEach(cleanup)

const layer = () => document.querySelector('[data-kro-toast-layer]') as HTMLElement

describe('placement — ActiveToast.md § Positioning', () => {
  it('keeps 96pt of trailing padding so the toast never overlaps the FAB', () => {
    render(<ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} />)

    expect(layer().style.paddingRight).toBe(`${CHROME_LAYOUT.toastTrailingPadding}px`)
  })

  it('sits 16pt off the leading edge and 24pt off the bottom', () => {
    render(<ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} />)

    expect(layer().style.paddingLeft).toBe(`${CHROME_LAYOUT.toastLeadingPadding}px`)
    expect(layer().style.bottom).toBe(`${CHROME_LAYOUT.toastBottomPadding}px`)
  })

  it('rises 15pt onto the FAB`s vertical centre when no pill is showing', () => {
    render(<ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} />)

    expect(layer().style.transform).toBe(
      `translateY(-${CHROME_LAYOUT.toastVerticalOffset}px)`,
    )
  })

  it('pins to the viewport by default, and to a box when a story asks it to', () => {
    const { rerender } = render(<ActiveToastLayer toast={toActiveToast({ message: 'a' })} />)
    expect(layer().style.position).toBe('fixed')

    rerender(<ActiveToastLayer toast={toActiveToast({ message: 'a' })} position="absolute" />)
    expect(layer().style.position).toBe('absolute')
  })
})

describe('the lift-above-pill rule', () => {
  it('lifts fully clear of the Session Pill while a session is running', () => {
    render(
      <ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} isSessionPillVisible />,
    )

    const expected = CHROME_LAYOUT.toastVerticalOffset + toastLiftAbovePill()
    expect(layer().style.transform).toBe(`translateY(-${expected}px)`)
    expect(layer().getAttribute('data-kro-toast-lifted')).toBe('true')
  })

  it('drops back down when the session ends and the pill goes', () => {
    const { rerender } = render(
      <ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} isSessionPillVisible />,
    )
    rerender(
      <ActiveToastLayer
        toast={toActiveToast({ message: 'Saved' })}
        isSessionPillVisible={false}
      />,
    )

    expect(layer().getAttribute('data-kro-toast-lifted')).toBe('false')
  })

  it('moves the lift on a plain ease, so it does not overshoot back into the pill', () => {
    render(
      <ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} isSessionPillVisible />,
    )

    expect(layer().style.transitionProperty).toBe('transform')
    expect(layer().style.transitionTimingFunction).not.toContain('linear(')
  })
})

describe('announcement', () => {
  it('keeps the live region mounted with no toast, so the first one is announced', () => {
    // A region created together with its message announces nothing: assistive
    // technology only reports mutations to a region it was already watching.
    render(<ActiveToastLayer toast={null} />)

    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.textContent).toBe('')
  })

  it('puts the message inside that region when a toast arrives', () => {
    render(
      <ActiveToastLayer toast={toActiveToast({ message: '"Buy groceries" marked complete' })} />,
    )

    expect(screen.getByRole('status').textContent).toContain(
      '"Buy groceries" marked complete',
    )
  })

  it('lets pointers through the empty layer, so it never blocks the surface beneath', () => {
    render(<ActiveToastLayer toast={null} />)

    expect(layer().style.pointerEvents).toBe('none')
  })

  it('re-enables pointers on the toast itself, so its Undo is clickable', () => {
    render(
      <ActiveToastLayer
        toast={toActiveToast({ message: 'Saved', primaryAction: { title: 'Undo', onSelect: () => {} } })}
      />,
    )

    const toast = document.querySelector('[data-kro-toast]') as HTMLElement
    expect(toast.style.pointerEvents).toBe('auto')
  })
})
