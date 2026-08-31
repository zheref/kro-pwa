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

/** Installs the stub and returns a teardown that puts the global back. */
export function installPointerEvents(): () => void {
  const original = (globalThis as { PointerEvent?: unknown }).PointerEvent

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

  return () => {
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
}
