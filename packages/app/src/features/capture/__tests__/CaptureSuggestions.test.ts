/** Canon's suggested endeavors and the pure rules the pane runs on. */
import { EndeavorKind } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  CAPTURE_MOCK_NOW,
  captureDraftFixtures,
  captureSuggestionMocks,
} from '../CaptureMocks'
import {
  CaptureDestination,
  CaptureKind,
  EVERY_DAY_RECURRENCE,
  canSubmitCapture,
  captureBlocker,
  endeavorFromCaptureResult,
} from '../CaptureRules'
import {
  CAPTURE_SUGGESTIONS,
  applyCaptureSuggestion,
  captureResultFromSuggestion,
  captureSuggestionById,
  captureSuggestionEventWindow,
  captureSuggestionLanding,
  captureSuggestionTallyText,
} from '../CaptureSuggestions'

describe('the suggestion catalogue', () => {
  it('ports canon’s 44 samples, twelve tasks first, with unique stable ids', () => {
    expect(CAPTURE_SUGGESTIONS).toHaveLength(44)
    expect(new Set(CAPTURE_SUGGESTIONS.map((item) => item.id)).size).toBe(44)
    expect(
      CAPTURE_SUGGESTIONS.slice(0, 12).every((item) => item.kind === 'task'),
    ).toBe(true)
  })

  it('gives every event a start offset and a length, and nothing else one', () => {
    for (const item of CAPTURE_SUGGESTIONS) {
      const isEvent = item.kind === CaptureKind.event
      expect(item.startMinutesFromNow !== null).toBe(isEvent)
      expect(item.durationMinutes !== null).toBe(isEvent)
    }
  })

  it('finds a suggestion by id, and nothing for an unknown one', () => {
    expect(captureSuggestionById(captureSuggestionMocks.task.id)?.title).toBe(
      'Prepare presentation slides',
    )
    expect(captureSuggestionById('nope')).toBeNull()
  })

  it('ships at least seven mock variants', () => {
    expect(Object.keys(captureSuggestionMocks).length).toBeGreaterThanOrEqual(7)
  })
})

describe('captureSuggestionEventWindow', () => {
  it('starts an event at its seeded offset and runs its seeded length', () => {
    const window = captureSuggestionEventWindow(
      captureSuggestionMocks.eventSoon,
      CAPTURE_MOCK_NOW,
    )
    expect(window?.start).toEqual(new Date(2026, 2, 17, 10, 37))
    expect(window?.end).toEqual(new Date(2026, 2, 17, 11, 7))
  })

  it('falls back to the next quarter hour and an hour — canon’s defaults', () => {
    const window = captureSuggestionEventWindow(
      captureSuggestionMocks.eventUnpinned,
      CAPTURE_MOCK_NOW,
    )
    expect(window?.start).toEqual(new Date(2026, 2, 17, 10, 15))
    expect(window?.end).toEqual(new Date(2026, 2, 17, 11, 15))
  })

  it('is null for every kind but an event', () => {
    expect(
      captureSuggestionEventWindow(
        captureSuggestionMocks.task,
        CAPTURE_MOCK_NOW,
      ),
    ).toBeNull()
  })
})

describe('applyCaptureSuggestion — canon’s applySuggestion', () => {
  it('fills the title, the emoji and the rewards as the user’s own', () => {
    const draft = applyCaptureSuggestion(
      captureDraftFixtures.emptyTask,
      captureSuggestionMocks.task,
      CAPTURE_MOCK_NOW,
    )
    expect(draft.title).toBe('Prepare presentation slides')
    expect(draft.pickedEmoji).toBe('📊')
    expect(draft.rewards).toBe(30)
    expect(draft.hasCustomRewards).toBe(true)
    // A task still owes its value rating on a Kro-owned host.
    expect(captureBlocker(draft)).toBe('missingValue')
  })

  it('seeds an event’s day, start and end, so Add is ready', () => {
    const draft = applyCaptureSuggestion(
      captureDraftFixtures.emptyTask,
      captureSuggestionMocks.eventTomorrow,
      CAPTURE_MOCK_NOW,
    )
    expect(draft.kind).toBe(CaptureKind.event)
    expect(draft.hasTime && draft.hasEndTime && draft.hasDate).toBe(true)
    expect(draft.time).toEqual(new Date(2026, 2, 17, 20, 7))
    expect(canSubmitCapture(draft)).toBe(true)
  })

  it('keeps the kind default for a suggestion with no rewards of its own', () => {
    const draft = applyCaptureSuggestion(
      captureDraftFixtures.titledTask,
      captureSuggestionMocks.habit,
      CAPTURE_MOCK_NOW,
    )
    expect(draft.kind).toBe(CaptureKind.habit)
    expect(draft.recurrence).toEqual(EVERY_DAY_RECURRENCE)
    const reminder = applyCaptureSuggestion(
      captureDraftFixtures.titledTask,
      captureSuggestionMocks.reminder,
      CAPTURE_MOCK_NOW,
    )
    expect(reminder.rewards).toBe(0)
    expect(reminder.value).toBeNull()
  })
})

describe('what a multi-add writes', () => {
  it('lands events in the Plan and everything else in the Inbox', () => {
    expect(captureSuggestionLanding(captureSuggestionMocks.eventSoon)).toBe(
      'plan',
    )
    expect(captureSuggestionLanding(captureSuggestionMocks.task)).toBe('inbox')
    expect(captureSuggestionLanding(captureSuggestionMocks.habit)).toBe('inbox')
  })

  it('writes a task unscheduled, with its emoji, rewards and no value', () => {
    const result = captureResultFromSuggestion(
      captureSuggestionMocks.task,
      CaptureDestination.local,
      CAPTURE_MOCK_NOW,
    )
    const endeavor = endeavorFromCaptureResult(result, {
      id: 'x',
      now: CAPTURE_MOCK_NOW,
    })
    expect(endeavor.title).toBe('📊 Prepare presentation slides')
    expect(endeavor.due).toBeNull()
    expect(endeavor.start).toBeNull()
    expect(endeavor.value).toBeNull()
    expect(endeavor.sessionPoints).toBe(30)
    expect(endeavor.kind).toBe(EndeavorKind.task)
  })

  it('creates an event at its seeded window', () => {
    const result = captureResultFromSuggestion(
      captureSuggestionMocks.eventSoon,
      CaptureDestination.local,
      CAPTURE_MOCK_NOW,
    )
    const endeavor = endeavorFromCaptureResult(result, {
      id: 'e',
      now: CAPTURE_MOCK_NOW,
    })
    expect(endeavor.kind).toBe(EndeavorKind.calendarEvent)
    expect(endeavor.start).toEqual(new Date(2026, 2, 17, 10, 37))
    expect(endeavor.duration).toBe(30 * 60)
  })

  it('gives a habit its every-day rule and a time, a reminder no rewards', () => {
    const habit = captureResultFromSuggestion(
      captureSuggestionMocks.habit,
      CaptureDestination.local,
      CAPTURE_MOCK_NOW,
    )
    expect(habit.recurrence).toEqual(EVERY_DAY_RECURRENCE)
    expect(habit.time).toEqual(new Date(2026, 2, 17, 10, 0))
    expect(habit.date).toBeNull()
    expect(
      captureResultFromSuggestion(
        captureSuggestionMocks.reminder,
        CaptureDestination.local,
        CAPTURE_MOCK_NOW,
      ).rewards,
    ).toBeNull()
  })
})

describe('captureSuggestionTallyText', () => {
  it('says Inbox only, Plan only, or splits a mixed batch', () => {
    expect(captureSuggestionTallyText(2, 0)).toBe('Added 2 to Inbox.')
    expect(captureSuggestionTallyText(0, 1)).toBe('Added 1 to Plan.')
    expect(captureSuggestionTallyText(2, 1)).toBe(
      'Added 3 — 2 to Inbox, 1 to Plan.',
    )
  })

  it('is null when nothing landed', () => {
    expect(captureSuggestionTallyText(0, 0)).toBeNull()
  })
})
