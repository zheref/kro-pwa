/**
 * The per-kind property rules canon's `EndeavorKind` and
 * `EndeavorHostingDestination` declare, the extra blockers they add, and the
 * persisted-title / symbol rules of the title row.
 */
import { EndeavorKind } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { CAPTURE_MOCK_NOW, captureDraftFixtures } from '../CaptureMocks'
import {
  CaptureBlocker,
  CaptureDestination,
  CaptureKind,
  EVERY_DAY_RECURRENCE,
  applyCaptureKindDefaults,
  canSubmitCapture,
  captureBlockedReason,
  captureBlocker,
  captureDestinationStoresKroEnhancedFields,
  captureDestinationsForKind,
  captureDurationLabel,
  captureKindDefaultRewards,
  captureKindEarnsRewards,
  captureKindRequiresRecurrence,
  captureKindRequiresTime,
  captureKindRequiresValue,
  captureKindSupportsDuration,
  captureKindSupportsValue,
  captureResolvedSymbol,
  captureResultFromDraft,
  captureTitleForPersistence,
  captureValueLabel,
  endeavorFromCaptureResult,
  isCaptureValueRequired,
  makeCaptureDraft,
  resolvedCaptureDestination,
} from '../CaptureRules'

const everyHost = [
  CaptureDestination.local,
  CaptureDestination.appleReminders,
  CaptureDestination.appleCalendar,
  CaptureDestination.kroCloud,
]

describe('what each kind carries', () => {
  it('opens a task at 30 points, a habit at 10, and the rest at 0', () => {
    expect(captureKindDefaultRewards(CaptureKind.task)).toBe(30)
    expect(captureKindDefaultRewards(CaptureKind.habit)).toBe(10)
    expect(captureKindDefaultRewards(CaptureKind.event)).toBe(0)
    expect(captureKindDefaultRewards(CaptureKind.reminder)).toBe(0)
  })

  it('lets only tasks and habits earn, rate and estimate', () => {
    for (const rule of [
      captureKindEarnsRewards,
      captureKindSupportsValue,
      captureKindSupportsDuration,
    ]) {
      expect(rule(CaptureKind.task)).toBe(true)
      expect(rule(CaptureKind.habit)).toBe(true)
      expect(rule(CaptureKind.event)).toBe(false)
      expect(rule(CaptureKind.reminder)).toBe(false)
    }
  })

  it('demands a value of a task only, and a time and a repeat of a habit only', () => {
    expect(captureKindRequiresValue(CaptureKind.task)).toBe(true)
    expect(captureKindRequiresValue(CaptureKind.habit)).toBe(false)
    expect(captureKindRequiresTime(CaptureKind.habit)).toBe(true)
    expect(captureKindRequiresTime(CaptureKind.task)).toBe(false)
    expect(captureKindRequiresRecurrence(CaptureKind.habit)).toBe(true)
    expect(captureKindRequiresRecurrence(CaptureKind.event)).toBe(false)
  })
})

describe('where each kind may be hosted', () => {
  it('stores Kro-enhanced fields only on Kro-owned hosts', () => {
    expect(captureDestinationStoresKroEnhancedFields('local')).toBe(true)
    expect(captureDestinationStoresKroEnhancedFields('kroCloud')).toBe(true)
    expect(captureDestinationStoresKroEnhancedFields('appleReminders')).toBe(
      false,
    )
    expect(captureDestinationStoresKroEnhancedFields('appleCalendar')).toBe(
      false,
    )
  })

  it('offers canon’s per-kind hosts, in canon’s order, among the connected ones', () => {
    expect(captureDestinationsForKind(CaptureKind.task, everyHost)).toEqual([
      'kroCloud',
      'local',
      'appleReminders',
    ])
    expect(captureDestinationsForKind(CaptureKind.event, everyHost)).toEqual([
      'appleCalendar',
      'kroCloud',
      'local',
    ])
    expect(captureDestinationsForKind(CaptureKind.reminder, everyHost)).toEqual(
      ['appleReminders', 'local'],
    )
  })

  it('narrows to On Device when nothing else is connected', () => {
    expect(captureDestinationsForKind(CaptureKind.event, ['local'])).toEqual([
      'local',
    ])
    expect(captureDestinationsForKind(CaptureKind.habit, [])).toEqual(['local'])
  })

  it('keeps a still-offered host and falls back to the kind’s first choice otherwise', () => {
    expect(
      resolvedCaptureDestination(CaptureKind.task, 'appleReminders', everyHost),
    ).toBe('appleReminders')
    // Reminders cannot host an event: Calendar is canon's first choice.
    expect(
      resolvedCaptureDestination(
        CaptureKind.event,
        'appleReminders',
        everyHost,
      ),
    ).toBe('appleCalendar')
    expect(
      resolvedCaptureDestination(CaptureKind.reminder, 'kroCloud', ['local']),
    ).toBe('local')
  })
})

describe('applyCaptureKindDefaults — canon’s applyKindChanged', () => {
  const task = captureDraftFixtures.fullyDescribedTask

  it('re-seeds rewards on a switch until the user moved the stepper', () => {
    expect(applyCaptureKindDefaults(task, CaptureKind.habit).rewards).toBe(10)
    expect(
      applyCaptureKindDefaults(
        { ...task, rewards: 55, hasCustomRewards: true },
        CaptureKind.habit,
      ).rewards,
    ).toBe(55)
  })

  it('drops value and duration for a kind without them, keeps them for a habit', () => {
    const reminder = applyCaptureKindDefaults(task, CaptureKind.reminder)
    expect(reminder.value).toBeNull()
    expect(reminder.duration).toBeNull()
    const habit = applyCaptureKindDefaults(task, CaptureKind.habit)
    expect(habit.value).toBe(5)
    expect(habit.duration).toBe(45 * 60)
  })

  it('gives a habit a time and an every-day rule, but keeps a rule already chosen', () => {
    const habit = applyCaptureKindDefaults(task, CaptureKind.habit)
    expect(habit.hasTime).toBe(true)
    expect(habit.recurrence).toEqual(EVERY_DAY_RECURRENCE)
    const weekly = applyCaptureKindDefaults(
      { ...task, recurrence: { kind: 'monthly', interval: 1, day: 3 } },
      CaptureKind.habit,
    )
    expect(weekly.recurrence.kind).toBe('monthly')
  })

  it('pins an event’s date the way KC-IS-#75 requires', () => {
    expect(
      applyCaptureKindDefaults({ ...task, hasDate: false }, CaptureKind.event)
        .hasDate,
    ).toBe(true)
  })

  it('opens a habit prompt already carrying its defaults', () => {
    const draft = makeCaptureDraft({
      kind: CaptureKind.habit,
      now: CAPTURE_MOCK_NOW,
      destination: CaptureDestination.local,
    })
    expect(draft.hasTime).toBe(true)
    expect(draft.recurrence).toEqual(EVERY_DAY_RECURRENCE)
    expect(draft.rewards).toBe(10)
    expect(draft.value).toBeNull()
    expect(draft.pickedEmoji).toBeNull()
  })
})

describe('the blockers canon adds', () => {
  it('blocks an unrated task on local storage, and names the rating', () => {
    expect(captureBlocker(captureDraftFixtures.unratedTask)).toBe(
      CaptureBlocker.missingValue,
    )
    expect(captureBlockedReason(captureDraftFixtures.unratedTask)).toBe(
      'Pick a value rating — required for On Device.',
    )
  })

  it('never demands a rating a foreign host would drop', () => {
    expect(
      isCaptureValueRequired(captureDraftFixtures.unratedTaskForReminders),
    ).toBe(false)
    expect(canSubmitCapture(captureDraftFixtures.unratedTaskForReminders)).toBe(
      true,
    )
    expect(isCaptureValueRequired(captureDraftFixtures.titledHabit)).toBe(false)
  })

  it('blocks a habit on its time first, then on its repeat', () => {
    expect(captureBlockedReason(captureDraftFixtures.habitMissingTime)).toBe(
      'Pick a time to add this habit.',
    )
    expect(
      captureBlockedReason(captureDraftFixtures.habitMissingRecurrence),
    ).toBe('Pick a repeat schedule to add this habit.')
    expect(captureBlocker(captureDraftFixtures.titledHabit)).toBeNull()
  })

  it('still reports a missing title before anything else', () => {
    expect(
      captureBlocker({ ...captureDraftFixtures.habitMissingTime, title: ' ' }),
    ).toBe(CaptureBlocker.missingTitle)
  })
})

describe('the value and duration copy', () => {
  it('labels the five ratings as Triage does', () => {
    expect(captureValueLabel(1)).toBe('Trivial')
    expect(captureValueLabel(5)).toBe('Life-changing')
    expect(captureValueLabel(6)).toBeNull()
  })

  it('words the duration presets as Triage does', () => {
    expect(captureDurationLabel(1)).toBe('A minute')
    expect(captureDurationLabel(120)).toBe('2 hours')
    expect(captureDurationLabel(180)).toBe('3 hours')
    expect(captureDurationLabel(45)).toBe('45 min')
  })
})

describe('captureTitleForPersistence', () => {
  it('stores the trimmed title as typed when nothing was picked', () => {
    expect(captureTitleForPersistence('  🎸 Practice  ', null)).toBe(
      '🎸 Practice',
    )
  })

  it('prepends a pick to a title with no emoji, or stands alone on an empty one', () => {
    expect(captureTitleForPersistence('Practice', '🎸')).toBe('🎸 Practice')
    expect(captureTitleForPersistence('   ', '🎸')).toBe('🎸')
  })

  it('replaces a leading emoji and normalizes the space after it', () => {
    expect(captureTitleForPersistence('🎹    Practice', '🎸')).toBe(
      '🎸 Practice',
    )
    expect(captureTitleForPersistence('👩‍💻', '🎸')).toBe('🎸')
  })

  it('replaces the first mid-title emoji in place', () => {
    expect(captureTitleForPersistence('Practice 🎹 then 🎺', '🎸')).toBe(
      'Practice 🎸 then 🎺',
    )
  })
})

describe('captureResolvedSymbol', () => {
  it('prefers the pick over a typed emoji', () => {
    expect(
      captureResolvedSymbol({
        ...captureDraftFixtures.titledTask,
        title: '🎹 Practice',
        pickedEmoji: '🎸',
      }),
    ).toBe('🎸')
  })

  it('falls back to the typed emoji, then the keyword table', () => {
    expect(
      captureResolvedSymbol({
        ...captureDraftFixtures.titledTask,
        title: '🎹 Practice',
      }),
    ).toBe('🎹')
    expect(
      captureResolvedSymbol({
        ...captureDraftFixtures.titledTask,
        title: 'Call mum',
      }),
    ).toBe('📞')
  })

  it('draws the clipboard for an untitled draft', () => {
    expect(captureResolvedSymbol(captureDraftFixtures.emptyTask)).toBe('📋')
  })
})

describe('what a confirmed prompt carries for value and duration', () => {
  it('carries a task’s value, duration and folded-in symbol onto the endeavor', () => {
    const result = captureResultFromDraft(
      captureDraftFixtures.fullyDescribedTask,
    )
    expect(result?.title).toBe('📝 Write the retro')
    expect(result?.value).toBe(5)
    expect(result?.duration).toBe(45 * 60)
    if (result === null) throw new Error('a rated task must submit')
    const built = endeavorFromCaptureResult(result, {
      id: 'x',
      now: CAPTURE_MOCK_NOW,
    })
    expect(built.kind).toBe(EndeavorKind.task)
    expect(built.value).toBe(5)
    expect(built.duration).toBe(45 * 60)
  })

  it('never carries a value or duration for a reminder', () => {
    const result = captureResultFromDraft({
      ...captureDraftFixtures.titledReminder,
      value: 4,
      duration: 60,
    })
    expect(result?.value).toBeNull()
    expect(result?.duration).toBeNull()
  })

  it('carries no rewards for an event', () => {
    expect(
      captureResultFromDraft(captureDraftFixtures.completeEvent)?.rewards,
    ).toBeNull()
  })
})
