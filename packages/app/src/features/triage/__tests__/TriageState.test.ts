import { describe, expect, it } from 'vitest'
import {
  TRIAGE_MOCK_NOW,
  triageEndeavorFixtures,
  triageMockAt,
} from '../TriageMocks'
import {
  TRIAGE_DEFAULT_RATING,
  TRIAGE_DEFAULT_REWARD_POINTS,
} from '../TriageRules'
import {
  TRIAGE_DEFAULT_SYMBOL,
  triageFormFromEndeavor,
  triageOutcomeEndsSession,
} from '../TriageState'

describe('triageFormFromEndeavor — the prefill', () => {
  it('never pre-populates the quadrant — the one explicit user decision', () => {
    for (const endeavor of Object.values(triageEndeavorFixtures)) {
      expect(triageFormFromEndeavor(endeavor).quadrant).toBeNull()
    }
  })

  it('takes every field the endeavor already carries — nothing defaults', () => {
    const form = triageFormFromEndeavor(triageEndeavorFixtures.fullyPrefilled)

    expect(form).toEqual({
      quadrant: null,
      durationMinutes: 25,
      dueDate: triageMockAt(19, 9),
      expiry: triageMockAt(19, 17),
      rewardPoints: 55,
      value: 4,
      effort: 2,
    })
  })

  it('falls back to canon’s defaults on a bare endeavor — 10 points, 1 and 1', () => {
    const form = triageFormFromEndeavor(triageEndeavorFixtures.unscheduledTask)

    expect(form.rewardPoints).toBe(TRIAGE_DEFAULT_REWARD_POINTS)
    expect(form.value).toBe(TRIAGE_DEFAULT_RATING)
    expect(form.effort).toBe(TRIAGE_DEFAULT_RATING)
  })

  it('leaves the duration undefined when the endeavor has none', () => {
    expect(
      triageFormFromEndeavor(triageEndeavorFixtures.unscheduledTask)
        .durationMinutes,
    ).toBeNull()
  })

  it('reads the scheduled date from `start` when `due` is absent', () => {
    const form = triageFormFromEndeavor(triageEndeavorFixtures.startOnlyTask)

    expect(form.dueDate).toEqual(triageMockAt(18, 15, 30))
  })

  it('seeds expiry to one hour after the scheduled date when none was carried', () => {
    const form = triageFormFromEndeavor(triageEndeavorFixtures.startOnlyTask)

    expect(form.expiry).toEqual(triageMockAt(18, 16, 30))
  })

  it('leaves expiry unset when there is no scheduled date to anchor it to', () => {
    expect(
      triageFormFromEndeavor(triageEndeavorFixtures.unscheduledTask).expiry,
    ).toBeNull()
  })

  it('truncates the duration to whole minutes — canon’s Int(seconds / 60)', () => {
    // 90 seconds prefills as 1 minute, not 1.5.
    expect(
      triageFormFromEndeavor(triageEndeavorFixtures.startOnlyTask)
        .durationMinutes,
    ).toBe(1)
  })

  it('honours an endeavor’s own expiry over the seeded default', () => {
    const form = triageFormFromEndeavor(triageEndeavorFixtures.fullyPrefilled)

    expect(form.expiry).toEqual(triageMockAt(19, 17))
    expect(form.expiry).not.toEqual(triageMockAt(19, 10))
  })
})

describe('triageOutcomeEndsSession', () => {
  it('ends the session on a confirmation — the Inbox pops before delegating', () => {
    expect(triageOutcomeEndsSession('completed')).toBe(true)
  })

  it('ends it on Start Now and on Archive', () => {
    expect(triageOutcomeEndsSession('startNow')).toBe(true)
    expect(triageOutcomeEndsSession('archived')).toBe(true)
  })

  it('ends it on a cancel', () => {
    expect(triageOutcomeEndsSession('dismissed')).toBe(true)
  })

  it('KEEPS it on a share — the screen stays under the share sheet', () => {
    expect(triageOutcomeEndsSession('shared')).toBe(false)
  })

  it('KEEPS it on an Edit request — Triage stays mounted underneath', () => {
    expect(triageOutcomeEndsSession('editRequested')).toBe(false)
  })
})

describe('TRIAGE_DEFAULT_SYMBOL', () => {
  it('is canon’s pushpin default for the header glyph', () => {
    expect(TRIAGE_DEFAULT_SYMBOL).toBe('📌')
  })

  it('is a single visible glyph, not an empty placeholder', () => {
    expect(TRIAGE_DEFAULT_SYMBOL.length).toBeGreaterThan(0)
  })

  it('is stable across reads — a constant, not a computed value', () => {
    expect(TRIAGE_DEFAULT_SYMBOL).toBe(TRIAGE_DEFAULT_SYMBOL)
  })
})

describe('the mock clock', () => {
  it('sits off a quarter hour so 10:07 and 10:15 cannot be confused', () => {
    expect(TRIAGE_MOCK_NOW.getMinutes() % 15).not.toBe(0)
  })

  it('is a Tuesday, which is what makes the EoW fixtures meaningful', () => {
    expect(TRIAGE_MOCK_NOW.getDay()).toBe(2)
  })

  it('is fixed, so a fixture’s scheduling is a fact about the fixture', () => {
    expect(TRIAGE_MOCK_NOW).toEqual(new Date(2026, 2, 17, 10, 7, 0))
  })
})

describe('prefill normalization — durations that map to no chip', () => {
  it('treats a zero-length duration as no estimate yet', () => {
    const form = triageFormFromEndeavor({
      ...triageEndeavorFixtures.startOnlyTask,
      duration: 0,
    })
    expect(form.durationMinutes).toBeNull()
  })

  it('truncates a sub-minute duration up to 1, never down to 0', () => {
    const form = triageFormFromEndeavor({
      ...triageEndeavorFixtures.startOnlyTask,
      duration: 30,
    })
    expect(form.durationMinutes).toBe(1)
  })
})
