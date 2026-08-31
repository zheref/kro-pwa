import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CHROME_LAYOUT,
  SHELL_BOTTOM_INSET_FALLBACK,
  SHELL_BOTTOM_INSET_VAR,
  toastLiftAbovePill,
} from '../layout/chromeLayout'
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
    // Canon's 24 plus whatever the shell reserves. With nothing published the
    // property resolves to its own `0px` fallback, which is where the toast
    // has always sat.
    expect(layer().style.bottom).toBe(
      `calc(${CHROME_LAYOUT.toastBottomPadding}px + ${SHELL_BOTTOM_INSET_FALLBACK})`,
    )
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

  it('does not change the lift when the shell reserves a bottom inset', () => {
    // The inset raises the pill by the same amount, so the distance between
    // the two — which is all the lift is — is unchanged. `chromeLayout.ts`
    // takes the inset as a parameter precisely so this is checkable.
    const { rerender } = render(
      <ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} isSessionPillVisible />,
    )
    const withoutShell = layer().style.transform

    rerender(
      <ActiveToastLayer
        toast={toActiveToast({ message: 'Saved' })}
        isSessionPillVisible
        bottomInset={60}
      />,
    )

    expect(layer().style.transform).toBe(withoutShell)
  })
})

describe('the shell’s bottom inset — canon’s 24pt is measured inside the tab', () => {
  it('clears a tab bar the shell tells it about', () => {
    // The web tab bar is an ordinary flex child, so the viewport bottom is
    // below it: without this the toast lands underneath the bar.
    render(<ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} bottomInset={60} />)

    // CSSOM folds a `calc()` of two absolute lengths to their sum, so the
    // assertion is on the resolved distance rather than on the expression.
    expect(layer().style.bottom).toBe(`calc(${CHROME_LAYOUT.toastBottomPadding + 60}px)`)
  })

  it('takes any CSS length, so a shell may hand over a safe-area inset', () => {
    render(
      <ActiveToastLayer
        toast={toActiveToast({ message: 'Saved' })}
        bottomInset="env(safe-area-inset-bottom)"
      />,
    )

    expect(layer().style.bottom).toBe(
      `calc(${CHROME_LAYOUT.toastBottomPadding}px + env(safe-area-inset-bottom))`,
    )
  })

  it('reads the shell’s published property when nobody passes one', () => {
    render(<ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} />)

    expect(layer().style.bottom).toContain(SHELL_BOTTOM_INSET_VAR)
    // The `0px` fallback is what keeps the kit shell-agnostic.
    expect(layer().style.bottom).toContain('0px')
  })
})

describe('announcement', () => {
  it('keeps the live region mounted with no toast, so the first one is announced', () => {
    // A region created together with its message announces nothing: assistive
    // technology only reports mutations to a region it was already watching.
    render(<ActiveToastLayer toast={null} />)

    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.getAttribute('aria-atomic')).toBe('true')
    expect(region.textContent).toBe('')
  })

  it('puts the message inside that region when a toast arrives', () => {
    render(
      <ActiveToastLayer toast={toActiveToast({ message: '"Buy groceries" marked complete' })} />,
    )

    expect(screen.getByRole('status').textContent).toBe('"Buy groceries" marked complete')
  })

  it('announces the message ONLY — never the action buttons alongside it', () => {
    // A live region containing the controls is read as
    // "…marked complete, Undo button, View button", and on some screen readers
    // fires twice. The visible toast therefore lives outside the region.
    render(
      <ActiveToastLayer
        toast={toActiveToast({
          message: '"Team meeting" deferred to 3:00 PM',
          primaryAction: { title: 'Undo', onSelect: () => {} },
          secondaryAction: { title: 'View', style: 'prominent', onSelect: () => {} },
        })}
      />,
    )

    const region = screen.getByRole('status')
    expect(region.textContent).toBe('"Team meeting" deferred to 3:00 PM')
    expect(region.querySelector('button')).toBeNull()
    // The buttons are still on screen — they just are not inside the region.
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDefined()
    expect(document.querySelector('[data-kro-toast]')?.closest('[role="status"]')).toBeNull()
  })

  it('hides the region from sight without hiding it from a screen reader', () => {
    render(<ActiveToastLayer toast={null} />)

    const region = screen.getByRole('status')
    expect(region.style.clipPath).toBe('inset(50%)')
    expect(region.getAttribute('aria-hidden')).toBeNull()
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

describe('entry motion', () => {
  const toastEl = () => document.querySelector('[data-kro-toast]') as HTMLElement

  it('starts off-stage, so the trailing slide has somewhere to come from', () => {
    render(<ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} />)

    expect(toastEl().style.opacity).toBe('0')
    expect(toastEl().style.transform).toBe('translateX(24px)')
  })

  it('starts off-stage for a REPLACEMENT too, not just the first toast', () => {
    // A one-deep replace swaps the model while the layer stays mounted. An
    // `entered` flag living on the layer would still be true, so the incoming
    // toast would paint at rest and skip the slide entirely.
    const { rerender } = render(
      <ActiveToastLayer toast={toActiveToast({ message: 'First' })} />,
    )
    rerender(<ActiveToastLayer toast={toActiveToast({ message: 'Second' })} />)

    expect(toastEl().textContent).toContain('Second')
    expect(toastEl().style.opacity).toBe('0')
    expect(toastEl().style.transform).toBe('translateX(24px)')
  })

  it('runs canon`s 0.4 / 0.8 spring, over its full settle time', () => {
    render(<ActiveToastLayer toast={toActiveToast({ message: 'Saved' })} />)

    const style = toastEl().style
    expect(style.transitionProperty).toBe('opacity, transform')
    // The spring settles at 495ms; pairing it with 400ms would cut the
    // overshoot off mid-flight.
    expect(style.transitionDuration).toBe('495ms')
    expect(style.transitionTimingFunction).toContain('linear(')
  })
})
