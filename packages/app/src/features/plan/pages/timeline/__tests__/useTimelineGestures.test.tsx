/**
 * The three pointer gestures, driven through a real DOM.
 *
 * Every case fires **pointer** events rather than `click` or `touchstart`,
 * because that is the whole claim the implementation makes: a mouse and a
 * finger are one code path. Where a case is about the touch path it says so by
 * setting `pointerType`, and the assertion is that the outcome is identical.
 *
 * jsdom has no `PointerEvent`, so the helper below dispatches a `MouseEvent`
 * carrying the pointer fields React reads. React's synthetic pointer events are
 * built from the native event's properties, not from its constructor, so this
 * exercises the same handlers a browser would.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SLOT_INDEX_ATTRIBUTE,
  pointerDistance,
  useBlockPress,
  useSlotPress,
  useVerticalDrag,
} from '../useTimelineGestures'
import { installPointerEvents, pointer } from '../../__tests__/pointerEvents'

installPointerEvents()

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  // `@kro/app`'s runner installs no global cleanup, so an unmounted tree would
  // leak into the next case's queries — every suite in this package unmounts
  // for itself.
  cleanup()
  vi.useRealTimers()
})

// --------------------------------------------------------------- block press

function BlockHarness({
  onTap,
  onHold,
}: {
  readonly onTap: () => void
  readonly onHold: (() => void) | null
}) {
  const { isPressed, handlers } = useBlockPress({
    onTap,
    onHold,
    holdMs: 600,
    maxDistancePx: 10,
  })
  return (
    <button
      type="button"
      data-testid="block"
      data-pressed={isPressed ? 'true' : 'false'}
      {...handlers}
    >
      block
    </button>
  )
}

describe('useBlockPress', () => {
  it('lights the block on the frame the finger lands — no wait for the gesture to resolve', () => {
    render(<BlockHarness onTap={() => {}} onHold={() => {}} />)
    const block = screen.getByTestId('block')

    expect(block.dataset.pressed).toBe('false')
    pointer('pointerDown', block, { clientX: 100, clientY: 100 })
    expect(block.dataset.pressed).toBe('true')
  })

  it('opens detail on a quick tap that never reaches the hold threshold', () => {
    const onTap = vi.fn()
    const onHold = vi.fn()
    render(<BlockHarness onTap={onTap} onHold={onHold} />)
    const block = screen.getByTestId('block')

    pointer('pointerDown', block, { clientX: 100, clientY: 100 })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    pointer('pointerUp', block, { clientX: 100, clientY: 100 })

    expect(onTap).toHaveBeenCalledTimes(1)
    expect(onHold).not.toHaveBeenCalled()
  })

  it('arms edit mode after 0.6s and then does NOT also open detail on release', () => {
    const onTap = vi.fn()
    const onHold = vi.fn()
    render(<BlockHarness onTap={onTap} onHold={onHold} />)
    const block = screen.getByTestId('block')

    pointer('pointerDown', block, { clientX: 100, clientY: 100 })
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(onHold).toHaveBeenCalledTimes(1)

    pointer('pointerUp', block, { clientX: 100, clientY: 100 })
    expect(onTap).not.toHaveBeenCalled()
  })

  it('releases the block when the finger slides into a scroll — canon 10px', () => {
    const onTap = vi.fn()
    const onHold = vi.fn()
    render(<BlockHarness onTap={onTap} onHold={onHold} />)
    const block = screen.getByTestId('block')

    pointer('pointerDown', block, { clientX: 100, clientY: 100 })
    pointer('pointerMove', block, { clientX: 100, clientY: 130 })

    expect(block.dataset.pressed).toBe('false')
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onHold).not.toHaveBeenCalled()

    pointer('pointerUp', block, { clientX: 100, clientY: 130 })
    expect(onTap).not.toHaveBeenCalled()
  })

  it('tolerates a wobble inside the threshold — a finger is never perfectly still', () => {
    const onTap = vi.fn()
    render(<BlockHarness onTap={onTap} onHold={null} />)
    const block = screen.getByTestId('block')

    pointer('pointerDown', block, { clientX: 100, clientY: 100 })
    pointer('pointerMove', block, { clientX: 104, clientY: 104 })
    pointer('pointerUp', block, { clientX: 104, clientY: 104 })

    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('never arms a past block, which still reports the press and still opens detail', () => {
    const onTap = vi.fn()
    render(<BlockHarness onTap={onTap} onHold={null} />)
    const block = screen.getByTestId('block')

    pointer('pointerDown', block, { clientX: 0, clientY: 0, pointerType: 'touch' })
    expect(block.dataset.pressed).toBe('true')
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    pointer('pointerUp', block, { clientX: 0, clientY: 0, pointerType: 'touch' })

    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('lets go when the browser cancels the touch to start scrolling', () => {
    render(<BlockHarness onTap={() => {}} onHold={() => {}} />)
    const block = screen.getByTestId('block')

    pointer('pointerDown', block, { pointerType: 'touch' })
    pointer('pointerCancel', block, { pointerType: 'touch' })

    expect(block.dataset.pressed).toBe('false')
  })
})

// ---------------------------------------------------------------- slot press

function SlotHarness({
  onCreate,
}: {
  readonly onCreate: (index: number, isHold: boolean) => void
}) {
  const { handlers } = useSlotPress({
    onCreate,
    holdMs: 300,
    maxDistancePx: 12,
    doubleTapMs: 350,
  })
  return (
    <div data-testid="slots" {...handlers}>
      <button type="button" {...{ [SLOT_INDEX_ATTRIBUTE]: 4 }} data-testid="slot-4">
        slot
      </button>
      <button type="button" {...{ [SLOT_INDEX_ATTRIBUTE]: 5 }} data-testid="slot-5">
        slot
      </button>
    </div>
  )
}

describe('useSlotPress', () => {
  it('creates at the pressed slot after a 0.3s hold, flagged as a hold', () => {
    const onCreate = vi.fn()
    render(<SlotHarness onCreate={onCreate} />)
    const slot = screen.getByTestId('slot-4')

    pointer('pointerDown', slot, { clientX: 50, clientY: 50 })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onCreate).toHaveBeenCalledWith(4, true)
  })

  it('creates at the same slot on a double tap, flagged as NOT a hold', () => {
    const onCreate = vi.fn()
    render(<SlotHarness onCreate={onCreate} />)
    const slot = screen.getByTestId('slot-4')

    pointer('pointerDown', slot, { clientX: 50, clientY: 50 })
    pointer('pointerUp', slot, { clientX: 50, clientY: 50 })
    act(() => {
      vi.advanceTimersByTime(80)
    })
    pointer('pointerDown', slot, { clientX: 51, clientY: 50 })
    pointer('pointerUp', slot, { clientX: 51, clientY: 50 })

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith(4, false)
  })

  it('does not create on a single tap — one tap on empty canvas means nothing', () => {
    const onCreate = vi.fn()
    render(<SlotHarness onCreate={onCreate} />)
    const slot = screen.getByTestId('slot-4')

    pointer('pointerDown', slot, { clientX: 50, clientY: 50 })
    pointer('pointerUp', slot, { clientX: 50, clientY: 50 })

    expect(onCreate).not.toHaveBeenCalled()
  })

  it('does not pair two taps on DIFFERENT slots into one create', () => {
    const onCreate = vi.fn()
    render(<SlotHarness onCreate={onCreate} />)

    pointer('pointerDown', screen.getByTestId('slot-4'), { clientX: 50, clientY: 50 })
    pointer('pointerUp', screen.getByTestId('slot-4'), { clientX: 50, clientY: 50 })
    pointer('pointerDown', screen.getByTestId('slot-5'), { clientX: 50, clientY: 70 })
    pointer('pointerUp', screen.getByTestId('slot-5'), { clientX: 50, clientY: 70 })

    expect(onCreate).not.toHaveBeenCalled()
  })

  it('does not pair two taps that arrive too far apart to be a double tap', () => {
    const onCreate = vi.fn()
    render(<SlotHarness onCreate={onCreate} />)
    const slot = screen.getByTestId('slot-4')

    pointer('pointerDown', slot, { clientX: 50, clientY: 50 })
    pointer('pointerUp', slot, { clientX: 50, clientY: 50 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    pointer('pointerDown', slot, { clientX: 50, clientY: 50 })
    pointer('pointerUp', slot, { clientX: 50, clientY: 50 })

    expect(onCreate).not.toHaveBeenCalled()
  })

  it('hands the touch back to the scroll view when a press travels', () => {
    const onCreate = vi.fn()
    render(<SlotHarness onCreate={onCreate} />)
    const slot = screen.getByTestId('slot-4')

    pointer('pointerDown', slot, { clientX: 50, clientY: 50, pointerType: 'touch' })
    pointer('pointerMove', slot, { clientX: 50, clientY: 90, pointerType: 'touch' })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    pointer('pointerUp', slot, { clientX: 50, clientY: 90, pointerType: 'touch' })

    expect(onCreate).not.toHaveBeenCalled()
  })

  it('ignores a press that lands on the layer but on no slot', () => {
    const onCreate = vi.fn()
    render(<SlotHarness onCreate={onCreate} />)
    const layer = screen.getByTestId('slots')

    pointer('pointerDown', layer, { clientX: 50, clientY: 50 })
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onCreate).not.toHaveBeenCalled()
  })
})

// ------------------------------------------------------------- vertical drag

function DragHarness({
  onBegin,
  onDrag,
  onEnd,
  minimumDistancePx,
}: {
  readonly onBegin: () => void
  readonly onDrag: (translationPx: number) => void
  readonly onEnd: () => void
  readonly minimumDistancePx?: number
}) {
  const { handlers } = useVerticalDrag({
    onBegin,
    onDrag,
    onEnd,
    minimumDistancePx,
  })
  return <button type="button" data-testid="handle" {...handlers} />
}

describe('useVerticalDrag', () => {
  it('reports translation CUMULATIVE from finger-down, never a per-frame delta', () => {
    const onDrag = vi.fn()
    render(
      <DragHarness onBegin={() => {}} onDrag={onDrag} onEnd={() => {}} />,
    )
    const handle = screen.getByTestId('handle')

    pointer('pointerDown', handle, { clientX: 0, clientY: 100 })
    pointer('pointerMove', handle, { clientX: 0, clientY: 115 })
    pointer('pointerMove', handle, { clientX: 0, clientY: 130 })

    // Cumulative: 15 then 30. A delta implementation would report 15 twice,
    // which is exactly the rounding drift the drag base exists to prevent.
    expect(onDrag).toHaveBeenNthCalledWith(1, 15)
    expect(onDrag).toHaveBeenNthCalledWith(2, 30)
  })

  it('grabs immediately with no minimum — a handle has nothing else to do', () => {
    const onBegin = vi.fn()
    render(<DragHarness onBegin={onBegin} onDrag={() => {}} onEnd={() => {}} />)

    pointer('pointerDown', screen.getByTestId('handle'), { clientY: 10 })
    expect(onBegin).toHaveBeenCalledTimes(1)
  })

  it('waits for the body threshold, so a tap on the card is not stolen', () => {
    const onBegin = vi.fn()
    const onDrag = vi.fn()
    render(
      <DragHarness
        onBegin={onBegin}
        onDrag={onDrag}
        onEnd={() => {}}
        minimumDistancePx={4}
      />,
    )
    const handle = screen.getByTestId('handle')

    pointer('pointerDown', handle, { clientX: 0, clientY: 100 })
    expect(onBegin).not.toHaveBeenCalled()

    pointer('pointerMove', handle, { clientX: 0, clientY: 102 })
    expect(onDrag).not.toHaveBeenCalled()

    pointer('pointerMove', handle, { clientX: 0, clientY: 110 })
    expect(onBegin).toHaveBeenCalledTimes(1)
    expect(onDrag).toHaveBeenCalledWith(10)
  })

  it('ends the drag on release so the draft survives and only the base is dropped', () => {
    const onEnd = vi.fn()
    render(<DragHarness onBegin={() => {}} onDrag={() => {}} onEnd={onEnd} />)
    const handle = screen.getByTestId('handle')

    pointer('pointerDown', handle, { clientY: 100 })
    pointer('pointerMove', handle, { clientY: 130 })
    pointer('pointerUp', handle, { clientY: 130 })

    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('reports nothing at all when disabled — a past block is inert', () => {
    const onBegin = vi.fn()
    const onDrag = vi.fn()
    render(
      <DisabledDragHarness onBegin={onBegin} onDrag={onDrag} />,
    )
    const handle = screen.getByTestId('handle')

    pointer('pointerDown', handle, { clientY: 100 })
    pointer('pointerMove', handle, { clientY: 140 })

    expect(onBegin).not.toHaveBeenCalled()
    expect(onDrag).not.toHaveBeenCalled()
  })
})

function DisabledDragHarness({
  onBegin,
  onDrag,
}: {
  readonly onBegin: () => void
  readonly onDrag: (translationPx: number) => void
}) {
  const { handlers } = useVerticalDrag({
    onBegin,
    onDrag,
    onEnd: () => {},
    disabled: true,
  })
  return <button type="button" data-testid="handle" {...handlers} />
}

describe('pointerDistance', () => {
  it('measures the straight line, not the vertical component alone', () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('is zero for a finger that has not moved', () => {
    expect(pointerDistance({ x: 7, y: 9 }, { x: 7, y: 9 })).toBe(0)
  })

  it('is unsigned, so travelling up cancels a press exactly as travelling down does', () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 0, y: -12 })).toBe(12)
  })
})
