import type { ActiveToastInput } from '../../../../design/chrome'
import { describe, expect, it, vi } from 'vitest'
import {
  noopDoCardHandlers,
  withCompletionToast,
} from '../doCardHandlers'
import { DO_SURFACE_MOCK_NOW, doSurfaceMocks, doSurfaceProps } from '../doSurfaceMocks'

const card = (() => {
  const first = doSurfaceProps(doSurfaceMocks.typicalDay).lanes.overdue[0]
  if (first === undefined) throw new Error('the Overdue fixture is empty')
  return first
})()

describe('the completion toast decoration', () => {
  it('still performs the completion it decorates', () => {
    const onMarkComplete = vi.fn()
    const decorated = withCompletionToast(
      { ...noopDoCardHandlers, onMarkComplete },
      { enqueue: () => 'toast-1', onUndo: () => {} },
    )

    decorated.onMarkComplete(card, DO_SURFACE_MOCK_NOW)

    expect(onMarkComplete).toHaveBeenCalledWith(card, DO_SURFACE_MOCK_NOW)
  })

  it('raises a toast naming the card and carrying its reward', () => {
    const raised: ActiveToastInput[] = []
    const decorated = withCompletionToast(noopDoCardHandlers, {
      enqueue: (input) => {
        raised.push(input)
        return 'toast-1'
      },
      onUndo: () => {},
    })

    decorated.onMarkComplete(card, DO_SURFACE_MOCK_NOW)

    expect(raised).toHaveLength(1)
    expect(raised[0]?.message).toBe(`${card.title} completed`)
    expect(raised[0]?.rewardAmount).toBe(card.reward)
    expect(raised[0]?.primaryAction?.title).toBe('Undo')
  })

  it('hands the completed card back when Undo is chosen', () => {
    const onUndo = vi.fn()
    let raised: ActiveToastInput | null = null
    const decorated = withCompletionToast(noopDoCardHandlers, {
      enqueue: (input) => {
        raised = input
        return 'toast-1'
      },
      onUndo,
    })

    decorated.onMarkComplete(card, DO_SURFACE_MOCK_NOW)
    ;(raised as ActiveToastInput | null)?.primaryAction?.onSelect()

    expect(onUndo).toHaveBeenCalledWith(card)
  })

  it('leaves every other intent untouched', () => {
    const onSkip = vi.fn()
    const decorated = withCompletionToast(
      { ...noopDoCardHandlers, onSkip },
      { enqueue: () => 'toast-1', onUndo: () => {} },
    )

    decorated.onSkip(card)

    expect(onSkip).toHaveBeenCalledWith(card)
  })
})

describe('the no-op set', () => {
  it('answers every intent without throwing, so a story can render undriven', () => {
    expect(() => {
      noopDoCardHandlers.onPrepare('overdue', card.id)
      noopDoCardHandlers.onDeselect()
      noopDoCardHandlers.onExecute(card)
      noopDoCardHandlers.onMarkComplete(card, DO_SURFACE_MOCK_NOW)
      noopDoCardHandlers.onSkip(card)
      noopDoCardHandlers.onDefer(card, DO_SURFACE_MOCK_NOW)
      noopDoCardHandlers.onDelegate(card)
      noopDoCardHandlers.onShowDetails(card)
      noopDoCardHandlers.onDelete(card)
    }).not.toThrow()
  })
})
