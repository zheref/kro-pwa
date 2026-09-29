/** The Shifters behind the value, duration, symbol and per-kind host rules. */
import { describe, expect, it } from 'vitest'
import { CAPTURE_MOCK_NOW, captureStateMocks } from '../CaptureMocks'
import {
  CaptureDestination,
  CaptureKind,
  EVERY_DAY_RECURRENCE,
} from '../CaptureRules'
import {
  withDestinationSelected,
  withDurationPicked,
  withEmojiPicked,
  withKindSelected,
  withPromptOpened,
  withRewardsPicked,
  withTimeEditEnded,
  withValuePicked,
} from '../CaptureShifters'

const openTask = captureStateMocks.promptOpenOnTask
const openHabit = captureStateMocks.promptOpenOnHabit
const openEvent = captureStateMocks.promptOpenOnEvent
const everyHost = captureStateMocks.promptOpenWithEveryHost
const closed = captureStateMocks.loadedPool

describe('withValuePicked', () => {
  it('rates a task the moment a star is tapped', () => {
    expect(withValuePicked(openTask, 4).prompt?.draft.value).toBe(4)
  })

  it('clears the rating when the selected star is tapped again', () => {
    expect(
      withValuePicked(withValuePicked(openTask, 4), null).prompt?.draft.value,
    ).toBeNull()
  })

  it('ignores a rating outside 1…5, on an event, or with no prompt', () => {
    expect(withValuePicked(openTask, 6)).toBe(openTask)
    expect(withValuePicked(openEvent, 3)).toBe(openEvent)
    expect(withValuePicked(closed, 3)).toBe(closed)
  })
})

describe('withDurationPicked', () => {
  it('estimates a habit at a preset length', () => {
    expect(withDurationPicked(openHabit, 900).prompt?.draft.duration).toBe(900)
  })

  it('clears the estimate when the selected preset is tapped again', () => {
    expect(
      withDurationPicked(withDurationPicked(openTask, 900), null).prompt?.draft
        .duration,
    ).toBeNull()
  })

  it('ignores a zero length, an event, and a closed prompt', () => {
    expect(withDurationPicked(openTask, 0)).toBe(openTask)
    expect(withDurationPicked(openEvent, 900)).toBe(openEvent)
    expect(withDurationPicked(closed, 900)).toBe(closed)
  })
})

describe('withEmojiPicked', () => {
  it('records the pick without touching the typed title', () => {
    const picked = withEmojiPicked(captureStateMocks.promptReadyToSubmit, '✈️')
    expect(picked.prompt?.draft.pickedEmoji).toBe('✈️')
    expect(picked.prompt?.draft.title).toBe('Book the flights')
  })

  it('replaces an earlier pick', () => {
    expect(
      withEmojiPicked(withEmojiPicked(openTask, '✈️'), '🧳').prompt?.draft
        .pickedEmoji,
    ).toBe('🧳')
  })

  it('ignores a blank pick and a closed prompt', () => {
    expect(withEmojiPicked(openTask, ' ')).toBe(openTask)
    expect(withEmojiPicked(closed, '✈️')).toBe(closed)
  })
})

describe('withRewardsPicked marks the value as the user’s own', () => {
  it('keeps the moved number through a kind switch', () => {
    const moved = withRewardsPicked(openTask, 55)
    expect(moved.prompt?.draft.hasCustomRewards).toBe(true)
    expect(
      withKindSelected(moved, CaptureKind.habit).prompt?.draft.rewards,
    ).toBe(55)
  })

  it('re-seeds an untouched number on a kind switch', () => {
    expect(
      withKindSelected(openTask, CaptureKind.habit).prompt?.draft.rewards,
    ).toBe(10)
  })

  it('is a no-op with no prompt', () => {
    expect(withRewardsPicked(closed, 55)).toBe(closed)
  })
})

describe('withKindSelected — the property rules on a switch', () => {
  it('drops a task’s value and duration when it becomes a reminder', () => {
    const rated = withDurationPicked(withValuePicked(openTask, 3), 600)
    const reminder = withKindSelected(rated, CaptureKind.reminder).prompt?.draft
    expect(reminder?.value).toBeNull()
    expect(reminder?.duration).toBeNull()
  })

  it('gives a habit a time and an every-day repeat', () => {
    const habit = withKindSelected(openTask, CaptureKind.habit).prompt?.draft
    expect(habit?.hasTime).toBe(true)
    expect(habit?.recurrence).toEqual(EVERY_DAY_RECURRENCE)
  })

  it('moves an unsupported host to the kind’s first supported one', () => {
    const onReminders = withDestinationSelected(
      everyHost,
      CaptureDestination.appleReminders,
    )
    expect(
      withKindSelected(onReminders, CaptureKind.event).prompt?.draft
        .destination,
    ).toBe(CaptureDestination.appleCalendar)
    // Local is supported by every kind, so it survives every switch.
    expect(
      withKindSelected(everyHost, CaptureKind.reminder).prompt?.draft
        .destination,
    ).toBe(CaptureDestination.local)
  })
})

describe('withDestinationSelected — per-kind support', () => {
  it('refuses Calendar for a task', () => {
    expect(
      withDestinationSelected(everyHost, CaptureDestination.appleCalendar),
    ).toBe(everyHost)
  })

  it('accepts Reminders for a task', () => {
    expect(
      withDestinationSelected(everyHost, CaptureDestination.appleReminders)
        .prompt?.draft.destination,
    ).toBe(CaptureDestination.appleReminders)
  })

  it('is a no-op with no prompt', () => {
    expect(withDestinationSelected(closed, CaptureDestination.local)).toBe(
      closed,
    )
  })
})

describe('withPromptOpened — the seeded host respects the kind', () => {
  it('opens a reminder on Reminders-or-Local, never the remembered Kro Cloud', () => {
    const remembered = captureStateMocks.everyHostRememberingKroCloud
    expect(
      withPromptOpened(remembered, {
        kind: CaptureKind.reminder,
        now: CAPTURE_MOCK_NOW,
        initialStart: null,
      }).prompt?.draft.destination,
    ).toBe(CaptureDestination.appleReminders)
  })
})

describe('withTimeEditEnded — a habit’s time is not clearable', () => {
  it('ignores Clear on a habit’s time', () => {
    expect(withTimeEditEnded(openHabit, 'start', 'clear')).toBe(openHabit)
  })

  it('still clears a task’s time', () => {
    const timed = withTimeEditEnded(openTask, 'start', 'clear').prompt?.draft
    expect(timed?.hasTime).toBe(false)
  })

  it('still clears an event’s end', () => {
    expect(
      withTimeEditEnded(openEvent, 'end', 'clear').prompt?.draft.hasEndTime,
    ).toBe(false)
  })
})
