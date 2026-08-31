/**
 * A minimal `PointerEvent` for jsdom, plus the one-line dispatcher every
 * gesture suite in this feature uses.
 *
 * ## Why this exists at all
 *
 * jsdom implements no `PointerEvent`. Testing Library resolves an event's
 * constructor from `window[EventType]`, so `fireEvent.pointerDown(el, {
 * clientY: 40 })` silently falls back to a plain `Event` — which has no
 * `clientX` / `clientY` — and React reports `undefined` for both. Every
 * distance guard in `useTimelineGestures` then compares against `NaN`, which is
 * false for `>` and `<` alike, so a press that travelled a hundred pixels reads
 * as a press that never moved. The suite passes for the wrong reason.
 *
 * `MouseEvent` **is** implemented and already carries the coordinate pair, so
 * the shim is `MouseEvent` plus the two pointer fields the hooks read. That
 * keeps the tests exercising the production handlers unchanged, rather than
 * pushing the code toward mouse events it does not use.
 *
 * Lives under `__tests__/` deliberately: it is test infrastructure, and the
 * repo's new-source-file guard exempts that directory rather than asking for a
 * test of a test helper.
 */
import { fireEvent } from '@testing-library/react'

interface TestPointerEventInit extends MouseEventInit {
  readonly pointerId?: number
  readonly pointerType?: string
  readonly isPrimary?: boolean
}

class JsdomPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly pointerType: string
  readonly isPrimary: boolean

  constructor(type: string, init: TestPointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 1
    this.pointerType = init.pointerType ?? 'mouse'
    this.isPrimary = init.isPrimary ?? true
  }
}

/**
 * Install the shim. Idempotent, so a suite may call it per file without
 * clobbering a real implementation if one ever appears.
 */
export function installPointerEvents(): void {
  const target = globalThis as unknown as { PointerEvent?: unknown }
  if (typeof target.PointerEvent === 'function') return
  target.PointerEvent = JsdomPointerEvent
  if (typeof window !== 'undefined') {
    ;(window as unknown as { PointerEvent: unknown }).PointerEvent =
      JsdomPointerEvent
  }
}

export type PointerPhase =
  | 'pointerDown'
  | 'pointerMove'
  | 'pointerUp'
  | 'pointerCancel'

export interface PointerAt {
  readonly clientX?: number
  readonly clientY?: number
  /** `'touch'` for the finger path, `'mouse'` for the pointer one. */
  readonly pointerType?: string
}

/**
 * Dispatch one pointer phase at a point.
 *
 * `button: 0` is always set because the hooks refuse a non-primary mouse
 * button — a right-click opens a context menu, it is not a press — and a test
 * that omitted it would be asserting the refusal by accident.
 */
export function pointer(
  phase: PointerPhase,
  element: Element,
  at: PointerAt = {},
): void {
  fireEvent[phase](element, {
    button: 0,
    pointerId: 1,
    pointerType: at.pointerType ?? 'mouse',
    clientX: at.clientX ?? 0,
    clientY: at.clientY ?? 0,
    bubbles: true,
  })
}
