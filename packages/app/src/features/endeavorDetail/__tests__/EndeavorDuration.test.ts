/**
 * The Duration profile and the read-only observed focus time.
 *
 * The seed ladder is the part worth pinning: canon prefills the dials from the
 * *observed* average without turning it into an authored preference, so a user
 * who has never set a duration still opens on a sensible number with every
 * switch off.
 */
import { EMPIRICAL_SAMPLE_MINIMUM, PerformResolution, makeEndeavor, makePerform, EndeavorKind } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DURATION_SEED,
  DurationBound,
  draftWithBoundAdjusted,
  draftWithBoundToggled,
  durationBounds,
  durationDraftFor,
  durationProfileOf,
  durationValidationMessage,
  observedFocusTime,
} from '../EndeavorDuration'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'

describe('observed focus time is computed from the completed sessions', () => {
  it('averages three qualifying sessions, rounded to the minute', () => {
    const observed = observedFocusTime(detailEndeavorMocks.taskWithSessions)
    // (1500 + 1800 + 2100) / 3 = 1800s = 30 min.
    expect(observed.seconds).toBe(1800)
    expect(observed.sampleCount).toBe(3)
  })

  it('stays locked below the sample minimum, and says what the minimum is', () => {
    const observed = observedFocusTime(detailEndeavorMocks.taskWithOneSession)
    expect(observed.seconds).toBeNull()
    expect(observed.sampleCount).toBe(1)
    expect(observed.requiredSampleCount).toBe(EMPIRICAL_SAMPLE_MINIMUM)
  })

  it('reports nothing observed for an endeavor that was never worked on', () => {
    const observed = observedFocusTime(detailEndeavorMocks.task)
    expect(observed.seconds).toBeNull()
    expect(observed.sampleCount).toBe(0)
  })

  it('excludes an aborted attempt from the sample', () => {
    const withAborted = makeEndeavor({
      id: 'aborted',
      title: 'aborted',
      kind: EndeavorKind.task,
      performances: [
        makePerform({
          date: new Date(2026, 5, 18, 8),
          duration: 1800,
          resolution: PerformResolution.aborted,
          wasCompletedInSession: true,
        }),
      ],
    })
    expect(observedFocusTime(withAborted).sampleCount).toBe(0)
  })

  it('excludes a quick complete that was never a session', () => {
    const quick = makeEndeavor({
      id: 'quick',
      title: 'quick',
      kind: EndeavorKind.task,
      performances: [
        makePerform({
          date: new Date(2026, 5, 18, 8),
          duration: 1800,
          resolution: PerformResolution.finished,
          wasCompletedInSession: false,
        }),
      ],
    })
    expect(observedFocusTime(quick).sampleCount).toBe(0)
  })
})

describe('the draft seeds from the authored value, then the observed one', () => {
  it('prefers an authored duration over the observed average', () => {
    const draft = durationDraftFor(detailEndeavorMocks.task)
    expect(draft.preferredSeconds).toBe(detailEndeavorMocks.task.duration)
    expect(draft.isPreferredEnabled).toBe(true)
  })

  it('prefills from the observed average WITHOUT enabling the switch', () => {
    const draft = durationDraftFor(detailEndeavorMocks.taskWithSessions)
    expect(draft.preferredSeconds).toBe(1800)
    // Enabling it is an explicit act — a learned value is not an authored one.
    expect(draft.isPreferredEnabled).toBe(false)
  })

  it('falls back to canon’s 25-minute seed with nothing authored or observed', () => {
    const draft = durationDraftFor(detailEndeavorMocks.taskWithOneSession)
    expect(draft.preferredSeconds).toBe(DEFAULT_DURATION_SEED)
  })

  it('seeds minimum and maximum from the same ladder, both switched off', () => {
    const draft = durationDraftFor(detailEndeavorMocks.task)
    expect(draft.minimumSeconds).toBe(detailEndeavorMocks.task.duration)
    expect(draft.maximumSeconds).toBe(detailEndeavorMocks.task.duration)
    expect(draft.isMinimumEnabled).toBe(false)
    expect(draft.isMaximumEnabled).toBe(false)
  })

  it('names its three bounds in canon’s display order', () => {
    expect(durationBounds).toEqual([
      DurationBound.preferred,
      DurationBound.minimum,
      DurationBound.maximum,
    ])
  })
})

describe('toggling and dialling a bound are independent', () => {
  const base = durationDraftFor(detailEndeavorMocks.task)

  it('flips a switch without touching its number', () => {
    const toggled = draftWithBoundToggled(base, DurationBound.minimum, true)
    expect(toggled.isMinimumEnabled).toBe(true)
    expect(toggled.minimumSeconds).toBe(base.minimumSeconds)
  })

  it('dials a number without touching its switch', () => {
    const dialled = draftWithBoundAdjusted(base, DurationBound.maximum, 3600)
    expect(dialled.maximumSeconds).toBe(3600)
    expect(dialled.isMaximumEnabled).toBe(false)
  })

  it('keeps the dialled number across an off-then-on toggle', () => {
    const dialled = draftWithBoundAdjusted(base, DurationBound.preferred, 2400)
    const off = draftWithBoundToggled(dialled, DurationBound.preferred, false)
    const on = draftWithBoundToggled(off, DurationBound.preferred, true)
    expect(on.preferredSeconds).toBe(2400)
  })
})

describe('the draft becomes the three nullable columns the domain stores', () => {
  const base = durationDraftFor(detailEndeavorMocks.task)

  it('writes null for a switched-off bound — "no authored preference"', () => {
    expect(durationProfileOf(base)).toEqual({
      preferred: detailEndeavorMocks.task.duration,
      minimum: null,
      maximum: null,
    })
  })

  it('writes the number for a switched-on bound', () => {
    const enabled = draftWithBoundToggled(base, DurationBound.minimum, true)
    expect(durationProfileOf(enabled).minimum).toBe(enabled.minimumSeconds)
  })

  it('writes all three nulls when every switch is off', () => {
    const allOff = draftWithBoundToggled(base, DurationBound.preferred, false)
    expect(durationProfileOf(allOff)).toEqual({
      preferred: null,
      minimum: null,
      maximum: null,
    })
  })
})

describe('validation catches the one incoherent profile', () => {
  const base = durationDraftFor(detailEndeavorMocks.task)
  const bothOn = draftWithBoundToggled(
    draftWithBoundToggled(base, DurationBound.minimum, true),
    DurationBound.maximum,
    true,
  )

  it('complains when an enabled minimum exceeds an enabled maximum', () => {
    const bad = draftWithBoundAdjusted(
      draftWithBoundAdjusted(bothOn, DurationBound.minimum, 3600),
      DurationBound.maximum,
      600,
    )
    expect(durationValidationMessage(bad)).toBe(
      'Minimum duration must not exceed maximum duration.',
    )
  })

  it('accepts a coherent pair', () => {
    const good = draftWithBoundAdjusted(
      draftWithBoundAdjusted(bothOn, DurationBound.minimum, 600),
      DurationBound.maximum,
      3600,
    )
    expect(durationValidationMessage(good)).toBeNull()
  })

  it('says nothing while only one of the two bounds is enabled', () => {
    const onlyMinimum = draftWithBoundAdjusted(
      draftWithBoundToggled(base, DurationBound.minimum, true),
      DurationBound.minimum,
      99999,
    )
    expect(durationValidationMessage(onlyMinimum)).toBeNull()
  })
})
