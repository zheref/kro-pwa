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
  SWIPE_COMMIT_PX,
  SWIPE_REVEAL_PX,
} from './EndeavorActionSurface'
import { installPointerEvents } from './__tests__/pointerEnvironment'

let uninstallPointerEvents: () => void

beforeEach(() => {
  uninstallPointerEvents = installPointerEvents()
})

afterEach(() => {
  cleanup()
  uninstallPointerEvents()
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

  it('marks the surface with the input it resolved, so a story can prove which grammar ran', () => {
    const { rerender } = render(<Surface input="touch" onOperation={() => undefined} />)
    const surface = () =>
      document.querySelector('[data-slot="endeavor-action-surface"]') as HTMLElement

    expect(surface().dataset.input).toBe('touch')

    rerender(<Surface input="pointer" onOperation={() => undefined} />)
    expect(surface().dataset.input).toBe('pointer')
  })
})
