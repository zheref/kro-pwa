/**
 * The input-duality tests.
 *
 * NOTE ON WHAT IS NOT HERE. The context menu is a Radix dropdown, and mounting
 * a Radix popper under jsdom costs 5–12 seconds — the measurement is written up
 * in `system/primitives/__tests__/radixEnvironment.tsx`, along with the fact
 * that it made `make test` fail outright. So the menu's TRIGGER and its
 * CONTENTS are asserted here (the contents through `resolveRowActions`, which is
 * the same list the menu maps over) and the opened panel is judged in the
 * Storybook stories. That is the split the design system already made for the
 * same reason, not a new exemption.
 */

import {
  EndeavorOperation,
  OperationRole,
  OperationTint,
  contextMenuGesture,
  makeEndeavorCapabilities,
  makeEndeavorOperationBinding,
  swipeLeadingGesture,
  swipeTrailingGesture,
} from '@kro/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EndeavorActionSurface,
  POINTER_CHROME,
  POINTER_GUTTER_VAR,
  SWIPE_COMMIT_PX,
  SWIPE_DRAG_THRESHOLD_PX,
  SWIPE_REVEAL_PX,
  pointerChromeGutterPx,
} from './EndeavorActionSurface'
import { installPointerEvents } from './__tests__/pointerEnvironment'

let pointerEnvironment: ReturnType<typeof installPointerEvents>

beforeEach(() => {
  pointerEnvironment = installPointerEvents()
})

afterEach(() => {
  cleanup()
  pointerEnvironment()
})

const capabilities = makeEndeavorCapabilities([
  makeEndeavorOperationBinding({
    operation: EndeavorOperation.markComplete,
    gesture: swipeLeadingGesture,
    icon: 'checkmark.circle',
    label: 'Complete',
    tint: OperationTint.green,
  }),
  makeEndeavorOperationBinding({
    operation: EndeavorOperation.delete,
    gesture: swipeTrailingGesture,
    role: OperationRole.destructive,
    icon: 'trash',
    label: 'Delete',
  }),
  makeEndeavorOperationBinding({
    operation: EndeavorOperation.share,
    gesture: contextMenuGesture,
    icon: 'archivebox',
    label: 'Share',
  }),
])

function Surface({
  input,
  onOperation,
}: {
  readonly input: 'touch' | 'pointer'
  readonly onOperation: (operation: string, id: string) => void
}) {
  return (
    <EndeavorActionSurface
      endeavorId="e1"
      capabilities={capabilities}
      onOperation={onOperation}
      input={input}
      label="Review pull request"
    >
      <div>Review pull request</div>
    </EndeavorActionSurface>
  )
}

const content = () =>
  document.querySelector('[data-slot="endeavor-action-content"]') as HTMLElement

function drag(distance: number) {
  const target = content()
  fireEvent.pointerDown(target, { clientX: 0 })
  fireEvent.pointerMove(target, { clientX: distance })
  fireEvent.pointerUp(target, { clientX: distance })
}

describe('touch — the swipe grammar', () => {
  it('renders BOTH swipe edges from the capability set', () => {
    render(<Surface input="touch" onOperation={() => undefined} />)

    expect(document.querySelector('[data-slot="endeavor-swipe-leading"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="endeavor-swipe-trailing"]')).not.toBeNull()
  })

  it('performs the leading action on a full swipe right — the iOS full-swipe idiom', () => {
    const onOperation = vi.fn()
    render(<Surface input="touch" onOperation={onOperation} />)

    drag(SWIPE_COMMIT_PX + 10)

    expect(onOperation).toHaveBeenCalledWith(EndeavorOperation.markComplete, 'e1')
  })

  it('performs the trailing action on a full swipe left', () => {
    const onOperation = vi.fn()
    render(<Surface input="touch" onOperation={onOperation} />)

    drag(-(SWIPE_COMMIT_PX + 10))

    expect(onOperation).toHaveBeenCalledWith(EndeavorOperation.delete, 'e1')
  })

  it('PARKS the buttons open on a short swipe instead of firing anything', () => {
    const onOperation = vi.fn()
    render(<Surface input="touch" onOperation={onOperation} />)

    drag(SWIPE_REVEAL_PX + 5)

    expect(onOperation).not.toHaveBeenCalled()
    expect(content().style.transform).not.toBe('translateX(0px)')
  })

  it('snaps back and fires nothing on a nudge below the reveal threshold', () => {
    const onOperation = vi.fn()
    render(<Surface input="touch" onOperation={onOperation} />)

    const target = content()
    fireEvent.pointerDown(target, { clientX: 0 })
    fireEvent.pointerMove(target, { clientX: 10 })
    // The surface DID move — otherwise this test would pass vacuously, which is
    // what it did before jsdom's missing `PointerEvent` was stubbed.
    expect(target.style.transform).toBe('translateX(10px)')

    fireEvent.pointerUp(target, { clientX: 10 })

    expect(onOperation).not.toHaveBeenCalled()
    expect(content().style.transform).toBe('translateX(0px)')
  })

  it('does not slide open onto an edge with no bindings', () => {
    const onlyTrailing = makeEndeavorCapabilities([
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.delete,
        gesture: swipeTrailingGesture,
        role: OperationRole.destructive,
        icon: 'trash',
        label: 'Delete',
      }),
    ])
    render(
      <EndeavorActionSurface
        endeavorId="e1"
        capabilities={onlyTrailing}
        onOperation={() => undefined}
        input="touch"
        label="Row"
      >
        <div>Row</div>
      </EndeavorActionSurface>,
    )

    drag(SWIPE_REVEAL_PX + 5)

    expect(content().style.transform).toBe('translateX(0px)')
  })

  it('shows no hover strip — there is nothing to hover with', () => {
    render(<Surface input="touch" onOperation={() => undefined} />)
    expect(document.querySelector('[data-slot="endeavor-hover-actions"]')).toBeNull()
  })
})

describe('the release decision — read from the pointer, not from the last render', () => {
  it('commits a full swipe whose final move never flushed to state', () => {
    // THE REGRESSION. `pointermove` is continuous and React batches, so the
    // last `setOffset` routinely has not landed when `pointerup` runs. This
    // release is the extreme case of that — the pointer travelled the full
    // commit distance and `offset` is still 0. Judged on the rendered offset
    // the swipe snapped shut and fired nothing.
    const onOperation = vi.fn()
    render(<Surface input="touch" onOperation={onOperation} />)

    const target = content()
    fireEvent.pointerDown(target, { clientX: 0 })
    fireEvent.pointerUp(target, { clientX: SWIPE_COMMIT_PX + 10 })

    expect(onOperation).toHaveBeenCalledWith(EndeavorOperation.markComplete, 'e1')
  })

  it('does NOT carry the previous drag’s distance into the next release', () => {
    // The other half of reading state: after a committed swipe the stale
    // `offset` could make a subsequent short drag commit again on distance it
    // never travelled.
    const onOperation = vi.fn()
    render(<Surface input="touch" onOperation={onOperation} />)

    drag(SWIPE_COMMIT_PX + 10)
    expect(onOperation).toHaveBeenCalledTimes(1)

    drag(SWIPE_REVEAL_PX - 1)

    expect(onOperation).toHaveBeenCalledTimes(1)
  })

  it('CAPTURES the pointer once the drag crosses the threshold, and hands it back', () => {
    // The row's transform is a frame behind the finger, so the pointer leaves
    // the content mid-swipe. Without capture the moves and the release land
    // somewhere else and the row is stuck open.
    render(<Surface input="touch" onOperation={() => undefined} />)

    const target = content()
    fireEvent.pointerDown(target, { clientX: 0, pointerId: 7 })
    // NOT at pointerdown — a captured pointer retargets the click, which is
    // what swallowed every tap on an in-row button.
    expect(pointerEnvironment.capture.captured).toEqual([])

    fireEvent.pointerMove(target, { clientX: SWIPE_DRAG_THRESHOLD_PX - 1, pointerId: 7 })
    expect(pointerEnvironment.capture.captured).toEqual([])

    fireEvent.pointerMove(target, { clientX: SWIPE_DRAG_THRESHOLD_PX, pointerId: 7 })
    expect(pointerEnvironment.capture.captured).toEqual([7])
    expect(pointerEnvironment.capture.released).toEqual([])

    fireEvent.pointerUp(target, { clientX: SWIPE_COMMIT_PX + 10, pointerId: 7 })
    expect(pointerEnvironment.capture.released).toEqual([7])
  })

  it('captures ONCE per gesture, however many moves the browser coalesces into', () => {
    render(<Surface input="touch" onOperation={() => undefined} />)

    const target = content()
    fireEvent.pointerDown(target, { clientX: 0, pointerId: 3 })
    for (const x of [20, 60, 100, 140]) {
      fireEvent.pointerMove(target, { clientX: x, pointerId: 3 })
    }

    expect(pointerEnvironment.capture.captured).toEqual([3])
  })

  it('never captures a TAP — the click has to reach the control it landed on', () => {
    // THE REGRESSION, in the shape jsdom can hold: capture is what retargets a
    // click to the capturing element, so canon's in-row Triage and Add for
    // Today buttons never fired in a real browser. Chromium proves the click
    // itself in `apps/web/e2e-kit/action-surface.spec.ts`; this pins the cause.
    render(<Surface input="touch" onOperation={() => undefined} />)

    const target = content()
    fireEvent.pointerDown(target, { clientX: 120, pointerId: 5 })
    fireEvent.pointerMove(target, { clientX: 121, pointerId: 5 })
    fireEvent.pointerUp(target, { clientX: 121, pointerId: 5 })

    expect(pointerEnvironment.capture.captured).toEqual([])
    expect(pointerEnvironment.capture.released).toEqual([])
  })

  it('does not capture a drag toward an edge the row cannot open', () => {
    // The bounded delta is the gate, so a pull toward an empty edge stays a
    // tap: the row does not move, and the click must still land.
    const onlyTrailing = makeEndeavorCapabilities([
      makeEndeavorOperationBinding({
        operation: EndeavorOperation.delete,
        gesture: swipeTrailingGesture,
        role: OperationRole.destructive,
        icon: 'trash',
        label: 'Delete',
      }),
    ])
    render(
      <EndeavorActionSurface
        endeavorId="e1"
        capabilities={onlyTrailing}
        onOperation={() => undefined}
        input="touch"
        label="Row"
      >
        <div>Row</div>
      </EndeavorActionSurface>,
    )

    const target = content()
    fireEvent.pointerDown(target, { clientX: 0, pointerId: 9 })
    fireEvent.pointerMove(target, { clientX: 80, pointerId: 9 })

    expect(pointerEnvironment.capture.captured).toEqual([])
  })

  it('performs ONCE when pointerup and pointercancel both fire for one gesture', () => {
    const onOperation = vi.fn()
    render(<Surface input="touch" onOperation={onOperation} />)

    const target = content()
    fireEvent.pointerDown(target, { clientX: 0 })
    fireEvent.pointerUp(target, { clientX: -(SWIPE_COMMIT_PX + 10) })
    fireEvent.pointerCancel(target, { clientX: -(SWIPE_COMMIT_PX + 10) })

    expect(onOperation).toHaveBeenCalledOnce()
  })

  it('ignores a release that never started a drag at all', () => {
    const onOperation = vi.fn()
    render(<Surface input="touch" onOperation={onOperation} />)

    fireEvent.pointerUp(content(), { clientX: SWIPE_COMMIT_PX + 10 })

    expect(onOperation).not.toHaveBeenCalled()
    expect(content().style.transform).toBe('translateX(0px)')
  })

  it('treats a sub-threshold release as a TAP and leaves a parked row parked', () => {
    const onOperation = vi.fn()
    render(<Surface input="touch" onOperation={onOperation} />)

    drag(SWIPE_REVEAL_PX + 5)
    const parked = content().style.transform
    expect(parked).not.toBe('translateX(0px)')

    const target = content()
    fireEvent.pointerDown(target, { clientX: 200 })
    fireEvent.pointerUp(target, { clientX: 200 + SWIPE_DRAG_THRESHOLD_PX - 1 })

    expect(onOperation).not.toHaveBeenCalled()
    expect(content().style.transform).toBe(parked)
  })
})

describe('pointer — the hover and context grammar', () => {
  it('turns the SAME swipe bindings into hover buttons', () => {
    render(<Surface input="pointer" onOperation={() => undefined} />)

    const strip = document.querySelector(
      '[data-slot="endeavor-hover-actions"]',
    ) as HTMLElement
    expect(strip).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Complete' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Delete' })).not.toBeNull()
  })

  it('performs the operation from a hover button', async () => {
    const onOperation = vi.fn()
    render(<Surface input="pointer" onOperation={onOperation} />)

    await userEvent.click(screen.getByRole('button', { name: 'Complete' }))

    expect(onOperation).toHaveBeenCalledWith(EndeavorOperation.markComplete, 'e1')
  })

  it('reveals the strip on FOCUS as well as hover — a keyboard user never hovers', () => {
    render(<Surface input="pointer" onOperation={() => undefined} />)

    const strip = document.querySelector(
      '[data-slot="endeavor-hover-actions"]',
    ) as HTMLElement
    expect(strip.className).toContain('group-focus-within:opacity-100')
    expect(strip.className).toContain('group-focus-within:pointer-events-auto')
  })

  it('shows no swipe edges — a mouse cannot swipe', () => {
    render(<Surface input="pointer" onOperation={() => undefined} />)

    expect(document.querySelector('[data-slot="endeavor-swipe-leading"]')).toBeNull()
    expect(document.querySelector('[data-slot="endeavor-swipe-trailing"]')).toBeNull()
  })

  it('gives the context menu a real, named, focusable trigger', () => {
    render(<Surface input="pointer" onOperation={() => undefined} />)

    const trigger = screen.getByRole('button', { name: 'Actions for Review pull request' })
    expect(trigger.tagName).toBe('BUTTON')
  })

  it('takes the INVISIBLE trigger out of the hit-test tree, exactly as the strip does', () => {
    // It sits at `z-3` in the top-right of every row. Left touchable while
    // `opacity-0`, a tap or a swipe that starts there opens a menu the user
    // cannot see instead of moving the row.
    render(<Surface input="pointer" onOperation={() => undefined} />)

    const trigger = screen.getByRole('button', { name: 'Actions for Review pull request' })
    expect(trigger.className).toContain('opacity-0')
    expect(trigger.className).toContain('pointer-events-none')
    expect(trigger.className).toContain('group-hover:pointer-events-auto')
    expect(trigger.className).toContain('group-focus-within:pointer-events-auto')
    // The keyboard is never gated by `pointer-events`, so tabbing to it still
    // reveals it — which is the whole reason the trigger exists.
    expect(trigger.className).toContain('focus-visible:pointer-events-auto')
  })

  it('marks the surface with the input it resolved, so a story can prove which grammar ran', () => {
    const { rerender } = render(<Surface input="touch" onOperation={() => undefined} />)
    const surface = () =>
      document.querySelector('[data-slot="endeavor-action-surface"]') as HTMLElement

    expect(surface().dataset.input).toBe('touch')

    rerender(<Surface input="pointer" onOperation={() => undefined} />)
    expect(surface().dataset.input).toBe('pointer')
  })
})

describe('the pointer chrome reserves its own gutter', () => {
  const surface = () =>
    document.querySelector('[data-slot="endeavor-action-surface"]') as HTMLElement

  it('measures the strip from the kit’s own geometry — inset, buttons, gaps', () => {
    expect(
      pointerChromeGutterPx({ hoverActionCount: 2, hasContextMenu: false }),
    ).toBe(
      POINTER_CHROME.stripInset +
        2 * POINTER_CHROME.stripButton +
        POINTER_CHROME.stripGap,
    )
  })

  it('falls back to the menu trigger when there is no strip', () => {
    expect(
      pointerChromeGutterPx({ hoverActionCount: 0, hasContextMenu: true }),
    ).toBe(POINTER_CHROME.triggerInset + POINTER_CHROME.triggerSize)
  })

  it('takes the WIDER of the two — they overlap, they do not sit side by side', () => {
    const wide = pointerChromeGutterPx({ hoverActionCount: 3, hasContextMenu: true })
    const strip =
      POINTER_CHROME.stripInset +
      3 * POINTER_CHROME.stripButton +
      2 * POINTER_CHROME.stripGap

    expect(wide).toBe(strip)
    expect(wide).toBeGreaterThan(
      POINTER_CHROME.triggerInset + POINTER_CHROME.triggerSize,
    )
  })

  it('reserves nothing at all when the row carries no chrome', () => {
    expect(
      pointerChromeGutterPx({ hoverActionCount: 0, hasContextMenu: false }),
    ).toBe(0)
  })

  it('publishes the gutter on the surface, for the children to reserve', () => {
    render(<Surface input="pointer" onOperation={() => undefined} />)

    // Two hover actions (the leading and trailing swipe bindings) and a menu.
    const expected = pointerChromeGutterPx({
      hoverActionCount: 2,
      hasContextMenu: true,
    })

    expect(surface().dataset.pointerGutter).toBe(String(expected))
    expect(surface().style.getPropertyValue(POINTER_GUTTER_VAR)).toBe(`${expected}px`)
  })

  it('publishes ZERO on touch, where none of that chrome is rendered', () => {
    render(<Surface input="touch" onOperation={() => undefined} />)

    expect(surface().dataset.pointerGutter).toBe('0')
    expect(surface().style.getPropertyValue(POINTER_GUTTER_VAR)).toBe('0px')
  })
})
