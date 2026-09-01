/**
 * The carousel's escape gesture, driven end to end.
 *
 * The interaction KC-IS-#26 asks for by name — *"the dismissal threshold both
 * sides of 18%"* — is asserted here through the component, on top of the pure
 * assertions in `triagePresentation.test.ts`. The two are not redundant: the
 * pure test proves the rule, this one proves the component **asks** it, with
 * the pointer grammar the kit's KC-IS-#73 round settled.
 *
 * jsdom implements neither `PointerEvent` nor the `*PointerCapture` trio, so
 * both come from the kit's own `installPointerEvents` — which also **records**
 * the captures, so "this gesture is held" is an assertion rather than an
 * assumption.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installPointerEvents } from '../../../../design/endeavor/__tests__/pointerEnvironment'
import {
  TRIAGE_DISMISS_THRESHOLD_FRACTION,
  TRIAGE_EDGE_STRIP_WIDTH,
} from '../triagePresentation'
import { TriageCarouselFragment } from '../TriageCarouselFragment'

/** The iPhone-width carousel every screenshot in this PR is taken at. */
const WIDTH = 390
const THRESHOLD = WIDTH * TRIAGE_DISMISS_THRESHOLD_FRACTION // 70.2px

let teardown: (() => void) & {
  readonly capture: {
    readonly captured: readonly number[]
    readonly released: readonly number[]
  }
}

beforeEach(() => {
  teardown = installPointerEvents()
})

afterEach(() => {
  cleanup()
  teardown()
})

const mount = (onDismiss = vi.fn()) => {
  render(
    <TriageCarouselFragment
      isPresenting
      onDismiss={onDismiss}
      carouselWidth={WIDTH}
    >
      <button type="button" data-testid="inner-control">
        A control inside the form
      </button>
    </TriageCarouselFragment>,
  )
  return { panel: screen.getByTestId('triage-carousel'), onDismiss }
}

/** One whole gesture: down at `startX`, a move to `startX + dx`, then release. */
const swipe = (
  panel: HTMLElement,
  { startX, dx, dy = 0 }: { startX: number; dx: number; dy?: number },
) => {
  fireEvent.pointerDown(panel, { pointerId: 1, clientX: startX, clientY: 300 })
  fireEvent.pointerMove(panel, {
    pointerId: 1,
    clientX: startX + dx,
    clientY: 300 + dy,
  })
  fireEvent.pointerUp(panel, {
    pointerId: 1,
    clientX: startX + dx,
    clientY: 300 + dy,
  })
}

describe('the 72px leading edge strip', () => {
  it("draws the strip at canon's width", () => {
    mount()
    expect(screen.getByTestId('triage-edge-strip').style.width).toBe(
      `${TRIAGE_EDGE_STRIP_WIDTH}px`,
    )
  })

  it('accepts a drag that starts inside the strip', () => {
    const { panel, onDismiss } = mount()

    swipe(panel, { startX: 8, dx: 200 })

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('ignores a drag that starts deeper into the form', () => {
    const { panel, onDismiss } = mount()

    // A horizontal swipe across the duration chip row must not dismiss Triage.
    swipe(panel, { startX: 200, dx: 300 })

    expect(onDismiss).not.toHaveBeenCalled()
    expect(teardown.capture.captured).toEqual([])
  })

  it("accepts a drag starting on the strip's last pixel and refuses the next one", () => {
    const first = mount()
    swipe(first.panel, { startX: TRIAGE_EDGE_STRIP_WIDTH, dx: 200 })
    expect(first.onDismiss).toHaveBeenCalledTimes(1)

    cleanup()

    const second = mount()
    swipe(second.panel, { startX: TRIAGE_EDGE_STRIP_WIDTH + 1, dx: 200 })
    expect(second.onDismiss).not.toHaveBeenCalled()
  })
})

describe('the ~18% dismissal threshold, both sides', () => {
  it('springs back when the release is short of it (69px of 390)', () => {
    const { panel, onDismiss } = mount()

    swipe(panel, { startX: 4, dx: Math.floor(THRESHOLD) - 1 })

    expect(onDismiss).not.toHaveBeenCalled()
    // Sprung back: the panel is at rest, not parked where the finger left it.
    expect(panel.getAttribute('data-kro-dragging')).toBe('false')
  })

  it('springs back at exactly the threshold — canon compares strictly', () => {
    const { panel, onDismiss } = mount()

    swipe(panel, { startX: 4, dx: THRESHOLD })

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('dismisses when the release is past it (71px of 390)', () => {
    const { panel, onDismiss } = mount()

    swipe(panel, { startX: 4, dx: Math.ceil(THRESHOLD) + 1 })

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('reads the POINTER at release, not the last painted offset', () => {
    const { panel, onDismiss } = mount()

    // A gesture that travelled far and then came most of the way back is a
    // spring-back, however far it went in the middle.
    fireEvent.pointerDown(panel, { pointerId: 1, clientX: 4, clientY: 300 })
    fireEvent.pointerMove(panel, { pointerId: 1, clientX: 340, clientY: 300 })
    fireEvent.pointerUp(panel, { pointerId: 1, clientX: 20, clientY: 300 })

    expect(onDismiss).not.toHaveBeenCalled()
  })
})

describe("the kit's post-KC-IS-#73 pointer grammar", () => {
  it('captures nothing on pointerdown, so a tap inside the form keeps its click', () => {
    const { panel } = mount()

    fireEvent.pointerDown(panel, { pointerId: 1, clientX: 8, clientY: 300 })

    expect(teardown.capture.captured).toEqual([])
  })

  it('captures at the threshold, and releases on the way out', () => {
    const { panel } = mount()

    swipe(panel, { startX: 8, dx: 200 })

    expect(teardown.capture.captured).toEqual([1])
    expect(teardown.capture.released).toEqual([1])
  })

  it('never latches on a gesture that stayed under the 10pt minimum', () => {
    const { panel, onDismiss } = mount()

    swipe(panel, { startX: 8, dx: 5 })

    expect(teardown.capture.captured).toEqual([])
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it("yields a mostly-vertical gesture to the form's scroller", () => {
    const { panel, onDismiss } = mount()

    // A thumb starting a scroll at the leading edge: 20px across, 90px down.
    swipe(panel, { startX: 8, dx: 20, dy: 90 })

    expect(teardown.capture.captured).toEqual([])
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('dismisses once when pointerup and pointercancel both fire', () => {
    const { panel, onDismiss } = mount()

    fireEvent.pointerDown(panel, { pointerId: 1, clientX: 8, clientY: 300 })
    fireEvent.pointerMove(panel, { pointerId: 1, clientX: 300, clientY: 300 })
    fireEvent.pointerUp(panel, { pointerId: 1, clientX: 300, clientY: 300 })
    fireEvent.pointerCancel(panel, { pointerId: 1, clientX: 300, clientY: 300 })

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('never dismisses on an unmeasured carousel', () => {
    const onDismiss = vi.fn()
    render(
      <TriageCarouselFragment isPresenting onDismiss={onDismiss}>
        {null}
      </TriageCarouselFragment>,
    )
    // jsdom measures every element as 0 x 0, so production's own measurement
    // path is exercised here and must decide nothing.
    swipe(screen.getByTestId('triage-carousel'), { startX: 8, dx: 300 })

    expect(onDismiss).not.toHaveBeenCalled()
  })
})

describe('what the layer shows when nothing is presented', () => {
  it('renders no panel at all', () => {
    render(
      <TriageCarouselFragment isPresenting={false} onDismiss={vi.fn()}>
        {null}
      </TriageCarouselFragment>,
    )
    expect(screen.queryByTestId('triage-carousel')).toBeNull()
    expect(screen.queryByTestId('triage-status-strip')).toBeNull()
  })

  it('reports the durable save that outlived the form', () => {
    render(
      <TriageCarouselFragment isPresenting={false} onDismiss={vi.fn()} isSaving>
        {null}
      </TriageCarouselFragment>,
    )
    const strip = screen.getByTestId('triage-status-strip')
    expect(strip.textContent).toBe('Saving…')
    expect(strip.getAttribute('role')).toBe('status')
  })

  it('raises a local save failure as an alert, and prefers it over any notice', () => {
    render(
      <TriageCarouselFragment
        isPresenting={false}
        onDismiss={vi.fn()}
        saveExceptionMessage="Couldn't save your triage decision: QuotaExceededError"
        notice="a deferred push"
      >
        {null}
      </TriageCarouselFragment>,
    )
    const strip = screen.getByTestId('triage-status-strip')
    expect(strip.getAttribute('role')).toBe('alert')
    expect(strip.textContent).toContain('QuotaExceededError')
  })

  it('reports a notice politely — a deferred push is not a lost decision', () => {
    render(
      <TriageCarouselFragment
        isPresenting={false}
        onDismiss={vi.fn()}
        notice="Sharing is unavailable here, so the message was copied to your clipboard."
      >
        {null}
      </TriageCarouselFragment>,
    )
    const strip = screen.getByTestId('triage-status-strip')
    expect(strip.getAttribute('role')).toBe('status')
    expect(strip.textContent).toContain('clipboard')
  })
})
