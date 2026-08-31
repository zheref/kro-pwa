import { describe, expect, it } from 'vitest'
import { shadowMocks } from '../__mocks__/EndeavorRelations.mocks'
import { EndeavorKind } from '../EndeavorKind'
import { makeShadow, shadowNothing } from '../Shadow'

describe('makeShadow', () => {
  it('carries every supplied field through unchanged', () => {
    expect(
      makeShadow({
        originalTitle: 'Cook Breakfast',
        sourceIdentifier: 'gcal-8891',
        kind: EndeavorKind.calendarEvent,
        source: 'googleCalendar',
        group: 'Personal',
        appleReminderPriority: 5,
      }),
    ).toEqual({
      originalTitle: 'Cook Breakfast',
      sourceIdentifier: 'gcal-8891',
      kind: 'calendarEvent',
      source: 'googleCalendar',
      group: 'Personal',
      appleReminderPriority: 5,
    })
  })

  it('defaults group and appleReminderPriority to null', () => {
    const shadow = makeShadow({
      originalTitle: 'x',
      sourceIdentifier: 'y',
      kind: EndeavorKind.task,
      source: 'z',
    })
    expect(shadow.group).toBeNull()
    expect(shadow.appleReminderPriority).toBeNull()
  })

  it('keeps priority 0 distinct from an absent priority', () => {
    // Canon: `0` explicitly means "no priority"; `null` means the shadow
    // predates source-metadata persistence and must fall back to its kind.
    expect(shadowMocks.appleHabit.appleReminderPriority).toBe(0)
    expect(shadowMocks.legacyWithoutPriority.appleReminderPriority).toBeNull()
  })

  it('keeps an empty-string group distinct from a null one', () => {
    expect(shadowMocks.unknownSource.group).toBe('')
    expect(shadowMocks.legacyWithoutPriority.group).toBeNull()
  })
})

describe('shadowNothing', () => {
  it('matches canon’s empty sentinel field for field', () => {
    expect(shadowNothing()).toEqual({
      originalTitle: '',
      sourceIdentifier: '',
      kind: EndeavorKind.task,
      source: '',
      group: null,
      appleReminderPriority: null,
    })
  })

  it('returns a fresh object each call, so no caller can share one', () => {
    expect(shadowNothing()).not.toBe(shadowNothing())
    expect(shadowNothing()).toEqual(shadowNothing())
  })

  it('defaults to the task kind, as canon does', () => {
    expect(shadowNothing().kind).toBe(EndeavorKind.task)
  })
})
