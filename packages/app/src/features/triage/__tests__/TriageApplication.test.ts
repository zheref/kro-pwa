import {
  EisenhowerQuadrant,
  EndeavorHost,
  EndeavorStatus,
  citizenshipOf,
  isKroEnhanced,
  isKroTourist,
  withDeferred,
  withSessionPoints,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  TRIAGE_DEFER_REASON,
  TRIAGE_PROMOTION_HOST,
  defersAddedByTriage,
  endeavorWithTriageConfirmed,
  endeavorWithTriageDecision,
  triageEntryPromotes,
  triageWillPromote,
} from '../TriageApplication'
import {
  TRIAGE_MOCK_NOW,
  triageDecisionFixtures,
  triageEndeavorFixtures,
  triageMockAt,
} from '../TriageMocks'
import type { TriageDecision } from '../TriageRules'

const at = { now: TRIAGE_MOCK_NOW }

const decisionFor = (
  endeavorId: string,
  overrides: Partial<TriageDecision> = {},
): TriageDecision => ({
  ...triageDecisionFixtures.dueOnly,
  endeavorId,
  ...overrides,
})

// ---------------------------------------------------------------------------
// The (due, duration) switch
// ---------------------------------------------------------------------------

describe('endeavorWithTriageDecision — scheduling branches', () => {
  it('reschedules when BOTH a date and a duration are set — start = due', () => {
    const applied = endeavorWithTriageDecision(
      triageEndeavorFixtures.unscheduledTask,
      triageDecisionFixtures.dueAndDuration,
      at,
    )

    expect(applied.start).toEqual(triageMockAt(24, 10, 7))
    expect(applied.duration).toBe(1500)
  })

  it('leaves `due` alone in the both-set branch — canon writes start, not due', () => {
    const applied = endeavorWithTriageDecision(
      triageEndeavorFixtures.unscheduledTask,
      triageDecisionFixtures.dueAndDuration,
      at,
    )

    expect(applied.due).toBeNull()
  })

  it('defers with a "triage" audit entry when only a date is set', () => {
    const applied = endeavorWithTriageDecision(
      triageEndeavorFixtures.unscheduledTask,
      triageDecisionFixtures.dueOnly,
      at,
    )

    expect(applied.due).toEqual(triageMockAt(24, 10, 7))
    expect(applied.defers).toHaveLength(1)
    expect(applied.defers[0]).toEqual({
      made: TRIAGE_MOCK_NOW,
      reason: TRIAGE_DEFER_REASON,
      target: triageMockAt(24, 10, 7),
    })
  })

  it('keeps the existing start when only a duration is set', () => {
    const applied = endeavorWithTriageDecision(
      triageEndeavorFixtures.startOnlyTask,
      {
        ...triageDecisionFixtures.durationOnly,
        quadrant: EisenhowerQuadrant.decide,
      },
      at,
    )

    expect(applied.start).toEqual(triageEndeavorFixtures.startOnlyTask.start)
    expect(applied.duration).toBe(2700)
  })

  it('changes no scheduling at all when neither is set', () => {
    const applied = endeavorWithTriageDecision(
      triageEndeavorFixtures.unscheduledTask,
      decisionFor(triageEndeavorFixtures.unscheduledTask.id, {
        dueDate: null,
        durationSeconds: null,
      }),
      at,
    )

    expect(applied.start).toBeNull()
    expect(applied.due).toBeNull()
    expect(applied.defers).toHaveLength(0)
  })

  it('changes no scheduling for a duration-only decision on an unstarted row', () => {
    const applied = endeavorWithTriageDecision(
      triageEndeavorFixtures.unscheduledTask,
      decisionFor(triageEndeavorFixtures.unscheduledTask.id, {
        dueDate: null,
        durationSeconds: 900,
      }),
      at,
    )

    expect(applied.start).toBeNull()
    expect(applied.duration).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

describe('endeavorWithTriageDecision — Archive', () => {
  it('closes the endeavor rather than deleting it, so history keeps it', () => {
    const archived = endeavorWithTriageDecision(
      triageEndeavorFixtures.unscheduledTask,
      triageDecisionFixtures.archive,
      at,
    )

    expect(archived.status).toBe(EndeavorStatus.closed)
  })

  it('writes NONE of the Kro-enhanced fields — canon returns early', () => {
    const archived = endeavorWithTriageDecision(
      triageEndeavorFixtures.unscheduledTask,
      triageDecisionFixtures.archive,
      at,
    )

    expect(archived.sessionPoints).toBeNull()
    expect(archived.value).toBeNull()
    expect(archived.effort).toBeNull()
    expect(archived.expiry).toBeNull()
  })

  it('applies no scheduling either, even with a duration in the decision', () => {
    const archived = endeavorWithTriageDecision(
      triageEndeavorFixtures.unscheduledTask,
      triageDecisionFixtures.archive,
      at,
    )

    expect(archived.duration).toBeNull()
    expect(archived.defers).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// The Kro-enhanced fields
// ---------------------------------------------------------------------------

describe('endeavorWithTriageDecision — Kro-enhanced fields', () => {
  it('writes every non-null field of the decision', () => {
    const applied = endeavorWithTriageDecision(
      triageEndeavorFixtures.unscheduledTask,
      triageDecisionFixtures.dueOnly,
      at,
    )

    expect(applied.sessionPoints).toBe(15)
    expect(applied.value).toBe(3)
    expect(applied.effort).toBe(1)
    expect(applied.expiry).toEqual(triageMockAt(24, 11, 7))
  })

  it('leaves an existing rating untouched when the decision carries null', () => {
    const applied = endeavorWithTriageDecision(
      triageEndeavorFixtures.fullyPrefilled,
      decisionFor(triageEndeavorFixtures.fullyPrefilled.id, {
        value: null,
        effort: null,
        rewardPoints: null,
        expiryDate: null,
      }),
      at,
    )

    expect(applied.value).toBe(4)
    expect(applied.effort).toBe(2)
    expect(applied.sessionPoints).toBe(55)
    expect(applied.expiry).toEqual(triageMockAt(19, 17))
  })

  it('never CLEARS a rating — a null decision field means "leave it"', () => {
    const applied = endeavorWithTriageDecision(
      triageEndeavorFixtures.fullyPrefilled,
      decisionFor(triageEndeavorFixtures.fullyPrefilled.id, { value: null }),
      at,
    )

    expect(applied.value).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Where the matrix guard and canon disagree
// ---------------------------------------------------------------------------

describe('the matrix-guard divergences', () => {
  it('schedules a HABIT, which the guarded `withDeferred` would silently drop', () => {
    const target = triageEndeavorFixtures.habit
    const decision = decisionFor(target.id)

    // The guarded helper is a no-op on a habit: `.defers` tracks `.due`, and
    // `due` is not relevant to a habit.
    const guarded = withDeferred(target, {
      target: decision.dueDate as Date,
      made: TRIAGE_MOCK_NOW,
      reason: TRIAGE_DEFER_REASON,
    })
    expect(guarded).toBe(target)

    // Triage writes it anyway, because canon's shifter carries no guard.
    const applied = endeavorWithTriageDecision(target, decision, at)
    expect(applied.due).toEqual(decision.dueDate)
    expect(applied.defers).toHaveLength(1)
  })

  it('rewards a CALENDAR EVENT, which the guarded `withSessionPoints` would drop', () => {
    const target = triageEndeavorFixtures.calendarEvent
    const decision = decisionFor(target.id, {
      dueDate: null,
      durationSeconds: null,
      rewardPoints: 42,
    })

    expect(withSessionPoints(target, 42)).toBe(target)

    const applied = endeavorWithTriageDecision(target, decision, at)
    expect(applied.sessionPoints).toBe(42)
  })

  it('still routes value / effort / expiry through the guarded helpers, which agree', () => {
    const applied = endeavorWithTriageDecision(
      triageEndeavorFixtures.habit,
      decisionFor(triageEndeavorFixtures.habit.id, { value: 5, effort: 4 }),
      at,
    )

    expect(applied.value).toBe(5)
    expect(applied.effort).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// Promotion — exactly at confirm
// ---------------------------------------------------------------------------

describe('triageWillPromote / triageEntryPromotes', () => {
  it('forecasts a promotion for a tourist', () => {
    expect(isKroTourist(triageEndeavorFixtures.touristReminder)).toBe(true)
    expect(triageWillPromote(triageEndeavorFixtures.touristReminder)).toBe(true)
  })

  it('forecasts nothing for a citizen — Kro already owns everything', () => {
    expect(triageWillPromote(triageEndeavorFixtures.unscheduledTask)).toBe(
      false,
    )
  })

  it('forecasts nothing for a row that is already enhanced', () => {
    expect(isKroEnhanced(triageEndeavorFixtures.enhancedTask)).toBe(true)
    expect(triageWillPromote(triageEndeavorFixtures.enhancedTask)).toBe(false)
  })

  it('ENTERING triage never promotes — not even a tourist', () => {
    expect(triageEntryPromotes(triageEndeavorFixtures.touristReminder)).toBe(
      false,
    )
    expect(triageEntryPromotes(triageEndeavorFixtures.unscheduledTask)).toBe(
      false,
    )
    expect(triageEntryPromotes(triageEndeavorFixtures.enhancedTask)).toBe(false)
  })
})

describe('endeavorWithTriageConfirmed', () => {
  it('promotes a tourist to Kro-enhanced by adding the local host', () => {
    const target = triageEndeavorFixtures.touristReminder
    const confirmed = endeavorWithTriageConfirmed(
      target,
      decisionFor(target.id),
      at,
    )

    expect(confirmed.hostedBy).toContain(TRIAGE_PROMOTION_HOST)
    expect(confirmed.hostedBy).toContain(EndeavorHost.appleReminders)
    expect(citizenshipOf(confirmed)).toBe('enhanced')
  })

  it('adds a Kro host and NOTHING else — no shadow, no new identifier', () => {
    const target = triageEndeavorFixtures.touristReminder
    const confirmed = endeavorWithTriageConfirmed(
      target,
      decisionFor(target.id),
      at,
    )

    expect(confirmed.id).toBe(target.id)
    expect(confirmed.shadows).toEqual(target.shadows)
    expect(confirmed.hostedBy).toHaveLength(target.hostedBy.length + 1)
  })

  it('leaves an already-enhanced row with exactly one Kro host', () => {
    const target = triageEndeavorFixtures.enhancedTask
    const confirmed = endeavorWithTriageConfirmed(
      target,
      decisionFor(target.id),
      at,
    )

    expect(confirmed.hostedBy).toEqual(target.hostedBy)
  })

  it('does not touch a citizen’s hosts', () => {
    const target = triageEndeavorFixtures.unscheduledTask
    const confirmed = endeavorWithTriageConfirmed(
      target,
      decisionFor(target.id),
      at,
    )

    expect(confirmed.hostedBy).toEqual(target.hostedBy)
  })

  it('carries the overlay onto the promoted row, which is the point of promoting', () => {
    const target = triageEndeavorFixtures.touristReminder
    const confirmed = endeavorWithTriageConfirmed(
      target,
      decisionFor(target.id, { value: 4, effort: 3, rewardPoints: 25 }),
      at,
    )

    expect(confirmed.value).toBe(4)
    expect(confirmed.effort).toBe(3)
    expect(confirmed.sessionPoints).toBe(25)
  })

  it('promotes on an Archive confirmation too — every quadrant persists the same way', () => {
    const target = triageEndeavorFixtures.touristReminder
    const confirmed = endeavorWithTriageConfirmed(
      target,
      { ...triageDecisionFixtures.archive, endeavorId: target.id },
      at,
    )

    expect(citizenshipOf(confirmed)).toBe('enhanced')
    expect(confirmed.status).toBe(EndeavorStatus.closed)
  })
})

describe('defersAddedByTriage', () => {
  it('reports the audit entry a due-only decision appended', () => {
    const before = triageEndeavorFixtures.unscheduledTask
    const after = endeavorWithTriageDecision(
      before,
      triageDecisionFixtures.dueOnly,
      at,
    )

    expect(defersAddedByTriage(before, after)).toHaveLength(1)
  })

  it('reports nothing for a decision that appended none', () => {
    const before = triageEndeavorFixtures.unscheduledTask
    const after = endeavorWithTriageDecision(
      before,
      triageDecisionFixtures.dueAndDuration,
      at,
    )

    expect(defersAddedByTriage(before, after)).toHaveLength(0)
  })

  it('reports nothing for an archive, which appends none either', () => {
    const before = triageEndeavorFixtures.unscheduledTask
    const after = endeavorWithTriageDecision(
      before,
      triageDecisionFixtures.archive,
      at,
    )

    expect(defersAddedByTriage(before, after)).toHaveLength(0)
  })
})
