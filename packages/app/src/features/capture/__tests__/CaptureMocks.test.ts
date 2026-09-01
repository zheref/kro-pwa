import { EndeavorKind, endeavorFromRecord } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  CAPTURE_MOCK_NOW,
  captureDraftFixtures,
  captureEndeavorFixtures,
  captureFixturePool,
  captureFixtureRecords,
  captureStateMocks,
} from '../CaptureMocks'
import {
  captureBlocker,
  canSubmitCapture,
  nearestQuarterHourSlot,
  nextQuarterHourSlot,
} from '../CaptureRules'

/**
 * The fixtures are load-bearing: every other suite in this folder asserts
 * against them, so a fixture that quietly stopped describing what its comment
 * claims would make those suites agree about the wrong thing.
 */
describe('the fixture instant', () => {
  it('sits where the next slot and the nearest slot disagree', () => {
    expect(nextQuarterHourSlot(CAPTURE_MOCK_NOW)).not.toEqual(
      nearestQuarterHourSlot(CAPTURE_MOCK_NOW),
    )
  })

  it('is mid-morning, so both "earlier today" and "later today" exist', () => {
    expect(CAPTURE_MOCK_NOW.getHours()).toBe(10)
  })

  it('is a fixed instant, not a clock read', () => {
    expect(CAPTURE_MOCK_NOW.getTime()).toBe(
      new Date(2026, 2, 17, 10, 7).getTime(),
    )
  })
})

describe('the endeavor fixtures', () => {
  it('cover every reason a row is or is not awaiting triage', () => {
    expect(captureFixturePool.length).toBeGreaterThanOrEqual(11)
    expect(captureEndeavorFixtures.freshTask.due).toBeNull()
    expect(captureEndeavorFixtures.scheduledTask.due).not.toBeNull()
    expect(captureEndeavorFixtures.startedTask.start).not.toBeNull()
    expect(captureEndeavorFixtures.undatedLegacyTask.createdAt).toBeNull()
  })

  it('include a non-event of each kind the Inbox accepts', () => {
    const kinds = captureFixturePool.map((value) => value.kind)
    expect(kinds).toContain(EndeavorKind.task)
    expect(kinds).toContain(EndeavorKind.reminder)
    expect(kinds).toContain(EndeavorKind.habit)
    expect(kinds).toContain(EndeavorKind.calendarEvent)
  })

  it('round-trip through the real record codec, so a Producer suite is honest', () => {
    for (const record of captureFixtureRecords()) {
      const hydrated = endeavorFromRecord(record, {
        defers: [],
        performances: [],
      })
      expect(hydrated.ok).toBe(true)
    }
  })
})

describe('the draft fixtures', () => {
  it('spell out one blocked row and one clear row per kind', () => {
    expect(captureBlocker(captureDraftFixtures.emptyTask)).toBe('missingTitle')
    expect(canSubmitCapture(captureDraftFixtures.titledTask)).toBe(true)
    expect(canSubmitCapture(captureDraftFixtures.titledReminder)).toBe(true)
    expect(canSubmitCapture(captureDraftFixtures.titledHabit)).toBe(true)
  })

  it('cover all three ways an event can be incomplete', () => {
    expect(captureBlocker(captureDraftFixtures.eventMissingBothTimes)).toBe(
      'missingEventStartAndEnd',
    )
    expect(captureBlocker(captureDraftFixtures.eventMissingStart)).toBe(
      'missingEventStart',
    )
    expect(captureBlocker(captureDraftFixtures.eventMissingEnd)).toBe(
      'missingEventEnd',
    )
  })

  it('include the one event shape that may be submitted', () => {
    expect(canSubmitCapture(captureDraftFixtures.completeEvent)).toBe(true)
  })
})

describe('the state mocks', () => {
  it('are produced by the real Shifters, so each is reachable', () => {
    expect(captureStateMocks.loadedPool.load).toEqual({ kind: 'loaded' })
    expect(captureStateMocks.loading.load).toEqual({ kind: 'loading' })
    expect(captureStateMocks.idle.load).toEqual({ kind: 'idle' })
  })

  it('include both sides of the capture routing split', () => {
    expect(
      captureStateMocks.taskCapturedAwaitingInbox.navigation?.route.kind,
    ).toBe('inbox')
    expect(
      captureStateMocks.eventCapturedAwaitingPlan.navigation?.route.kind,
    ).toBe('plan')
  })

  it('include both ends of the undo window', () => {
    expect(captureStateMocks.undoArmed.undo.kind).toBe('armed')
    expect(captureStateMocks.undoExpired.undo.kind).toBe('expired')
  })
})
