/**
 * `PointerEvent`, which jsdom does not implement.
 *
 * Measured, not assumed: with `globalThis.PointerEvent` undefined, Testing
 * Library's `fireEvent.pointerMove(el, { clientX: 140 })` falls back to a plain
 * `Event`, and React's synthetic handler receives `clientX: undefined`. A swipe
 * test written against that reads as "the surface did not move" and passes
 * vacuously in the one direction and fails in the other — which is exactly how
 * a gesture ships broken with a green suite.
 *
 * The stub is the smallest thing that closes the gap: `PointerEvent` extends
 * `MouseEvent` in the DOM spec, and every property these tests care about
 * (`clientX`, `clientY`, `button`, `bubbles`) is `MouseEvent`'s. The
 * pointer-specific fields are carried through from the init dictionary so a
 * handler reading `pointerId` or `pointerType` sees what the test passed.
 *
 * Same shape and same rationale as
 * `system/primitives/__tests__/radixEnvironment.ts`: enough for the behaviour
 * under test to run, never enough to make a claim about a real browser. Where a
 * pointer actually lands, and whether a browser coalesces moves, are a real
 * browser's answers.
 */

interface PointerInit extends MouseEventInit {
  readonly pointerId?: number
  readonly pointerType?: string
  readonly isPrimary?: boolean
}

/** What the capture stubs recorded, so a test can assert the gesture was held. */
export interface PointerCaptureLog {
  readonly captured: readonly number[]
  readonly released: readonly number[]
}

/**
 * Installs the stub and returns a teardown that puts the global back.
 *
 * The returned `capture` log is the second half: jsdom implements none of the
 * `*PointerCapture` trio, so a component that captures its drag would throw
 * here and — worse — a component that FORGOT to capture would look identical.
 * The stubs record instead, so "this gesture is held" is an assertion rather
 * than an assumption.
 */
export function installPointerEvents(): (() => void) & { readonly capture: PointerCaptureLog } {
  const original = (globalThis as { PointerEvent?: unknown }).PointerEvent
  const originalCapture = {
    set: Element.prototype.setPointerCapture,
    release: Element.prototype.releasePointerCapture,
    has: Element.prototype.hasPointerCapture,
  }

  const captured: number[] = []
  const released: number[] = []
  const held = new Set<number>()

  Element.prototype.setPointerCapture = function setPointerCapture(pointerId: number) {
    captured.push(pointerId)
    held.add(pointerId)
  }
  Element.prototype.releasePointerCapture = function releasePointerCapture(pointerId: number) {
    released.push(pointerId)
    held.delete(pointerId)
  }
  Element.prototype.hasPointerCapture = function hasPointerCapture(pointerId: number) {
    return held.has(pointerId)
  }

  class PointerEventStub extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    readonly isPrimary: boolean

    constructor(type: string, init: PointerInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'touch'
      this.isPrimary = init.isPrimary ?? true
    }
  }

  Object.defineProperty(globalThis, 'PointerEvent', {
    value: PointerEventStub,
    configurable: true,
    writable: true,
  })

  const teardown = () => {
    Element.prototype.setPointerCapture = originalCapture.set
    Element.prototype.releasePointerCapture = originalCapture.release
    Element.prototype.hasPointerCapture = originalCapture.has
    if (original === undefined) {
      Reflect.deleteProperty(globalThis as object, 'PointerEvent')
    } else {
      Object.defineProperty(globalThis, 'PointerEvent', {
        value: original,
        configurable: true,
        writable: true,
      })
    }
  }

  const capture: PointerCaptureLog = { captured, released }
  return Object.assign(teardown, { capture })
}
