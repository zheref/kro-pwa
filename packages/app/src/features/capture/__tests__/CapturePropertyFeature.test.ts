/** The reducer arms for the value, duration and symbol events (`RC-12`). */
import { describe, expect, it } from 'vitest'
import {
  captureSlice,
  userDidPickDuration,
  userDidPickEmoji,
  userDidPickValue,
} from '../CaptureFeature'
import { captureStateMocks } from '../CaptureMocks'

const reduce = captureSlice.reducer
const openTask = captureStateMocks.promptOpenOnTask
const openEvent = captureStateMocks.promptOpenOnEvent
const closed = captureStateMocks.loadedPool

describe('userDidPickValue', () => {
  it('rates the task and unblocks Add', () => {
    const next = reduce(
      captureStateMocks.promptTaskMissingValue,
      userDidPickValue({ value: 3 }),
    )
    expect(next.prompt?.draft.value).toBe(3)
  })

  it('clears the rating when the selected star is tapped again', () => {
    const rated = reduce(openTask, userDidPickValue({ value: 2 }))
    expect(
      reduce(rated, userDidPickValue({ value: null })).prompt?.draft.value,
    ).toBeNull()
  })

  it('leaves an event and a closed prompt untouched', () => {
    expect(reduce(openEvent, userDidPickValue({ value: 3 }))).toEqual(openEvent)
    expect(reduce(closed, userDidPickValue({ value: 3 }))).toEqual(closed)
  })
})

describe('userDidPickDuration', () => {
  it('estimates the task at a preset', () => {
    expect(
      reduce(openTask, userDidPickDuration({ seconds: 1500 })).prompt?.draft
        .duration,
    ).toBe(1500)
  })

  it('clears the estimate', () => {
    const estimated = reduce(openTask, userDidPickDuration({ seconds: 1500 }))
    expect(
      reduce(estimated, userDidPickDuration({ seconds: null })).prompt?.draft
        .duration,
    ).toBeNull()
  })

  it('leaves an event untouched — it derives its length from start and end', () => {
    expect(reduce(openEvent, userDidPickDuration({ seconds: 60 }))).toEqual(
      openEvent,
    )
  })
})

describe('userDidPickEmoji', () => {
  it('records the badge’s pick', () => {
    expect(
      reduce(openTask, userDidPickEmoji({ emoji: '🧺' })).prompt?.draft
        .pickedEmoji,
    ).toBe('🧺')
  })

  it('keeps the typed title as it is', () => {
    const ready = captureStateMocks.promptReadyToSubmit
    expect(
      reduce(ready, userDidPickEmoji({ emoji: '🧺' })).prompt?.draft.title,
    ).toBe(ready.prompt?.draft.title)
  })

  it('does nothing once the prompt is dismissed', () => {
    expect(reduce(closed, userDidPickEmoji({ emoji: '🧺' }))).toEqual(closed)
  })
})
