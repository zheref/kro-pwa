import { EisenhowerQuadrant, EndeavorHost } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { TriageExceptions } from '../TriageException'
import { initialTriageState } from '../TriageFeature'
import { TriageExpiryPreset } from '../TriageExpiry'
import {
  TRIAGE_MOCK_NOW,
  triageDayFixtures,
  triageEndeavorFixtures,
  triageMockAt,
  triageSessionSeed,
  triageStateMocks,
} from '../TriageMocks'
import {
  withDueDatePicked,
  withDurationPicked,
  withEffortRatingTapped,
  withException,
  withExpiryPicked,
  withExpiryPresetTapped,
  withFetchStarted,
  withOutcomeCleared,
  withOutcomeRaised,
  withQuadrantPicked,
  withRewardPointsPicked,
  withRewardPointsStepped,
  withSaveFailed,
  withSaveStarted,
  withSaved,
  withSessionOpened,
  withShareSheetDismissed,
  withValueRatingTapped,
} from '../TriageShifters'

const opened = triageStateMocks.pristine
const formOf = (state: typeof opened) => state.session?.form ?? null

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('withFetchStarted', () => {
  it('moves an idle slice into loading — the first open', () => {
    expect(withFetchStarted(initialTriageState).load.kind).toBe('loading')
  })

  it('clears a prior exception, so a retry does not paint the old failure', () => {
    expect(withFetchStarted(triageStateMocks.failed).load.kind).toBe('loading')
  })

  it('leaves an open session alone while a re-read is in flight', () => {
    expect(withFetchStarted(opened).session).toBe(opened.session)
  })
})

describe('withException', () => {
  it('lands the failure in the one lifecycle field', () => {
    const failed = withException(
      withFetchStarted(initialTriageState),
      TriageExceptions.sessionLoadFailed('offline'),
    )

    expect(failed.load).toEqual({
      kind: 'failed',
      exception: TriageExceptions.sessionLoadFailed('offline'),
    })
  })

  it('leaves the open form exactly where the user left it', () => {
    const failed = withException(
      opened,
      TriageExceptions.sessionLoadFailed('offline'),
    )

    expect(failed.session).toBe(opened.session)
  })

  it('replaces an earlier exception rather than stacking them', () => {
    const first = withException(
      initialTriageState,
      TriageExceptions.sessionLoadFailed('a'),
    )
    const second = withException(first, TriageExceptions.endeavorNotFound('b'))

    expect(second.load.kind === 'failed' && second.load.exception.kind).toBe(
      'endeavorNotFound',
    )
  })
})

describe('withSessionOpened', () => {
  it('prefills the form from the endeavor and leaves the quadrant unset', () => {
    const form = formOf(opened)

    expect(form?.quadrant).toBeNull()
    expect(form?.rewardPoints).toBe(10)
    expect(form?.value).toBe(1)
  })

  it('snapshots the citizenship at entry WITHOUT promoting the endeavor', () => {
    const state = withSessionOpened(
      withFetchStarted(initialTriageState),
      triageSessionSeed({ endeavor: triageEndeavorFixtures.touristReminder }),
    )

    expect(state.session?.citizenshipAtEntry).toBe('tourist')
    expect(state.session?.willPromoteOnConfirm).toBe(true)
    // The fixture is untouched: entering triage writes nothing.
    expect(triageEndeavorFixtures.touristReminder.hostedBy).toEqual([
      EndeavorHost.appleReminders,
    ])
  })

  it('clears a previous row’s save notice, so the banner does not carry over', () => {
    const reopened = withSessionOpened(
      triageStateMocks.savedPushDeferred,
      triageSessionSeed(),
    )

    expect(reopened.save.kind).toBe('idle')
    expect(reopened.outcome).toBeNull()
  })

  it('starts the expiry scroll nonce at zero', () => {
    expect(opened.session?.expiryScrollNonce).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Quadrant
// ---------------------------------------------------------------------------

describe('withQuadrantPicked', () => {
  it('seeds Schedule one week out and expiry an hour after that', () => {
    const state = withQuadrantPicked(
      opened,
      EisenhowerQuadrant.decide,
      TRIAGE_MOCK_NOW,
    )

    expect(formOf(state)?.dueDate).toEqual(triageMockAt(24, 10, 7))
    expect(formOf(state)?.expiry).toEqual(triageMockAt(24, 11, 7))
  })

  it('seeds the Urgent column from the DURATION-aware gap search', () => {
    const busy = withSessionOpened(
      withFetchStarted(initialTriageState),
      triageSessionSeed({ busyIntervals: triageDayFixtures.busyMorning }),
    )
    const state = withQuadrantPicked(
      withDurationPicked(busy, 25),
      EisenhowerQuadrant.prioritize,
      TRIAGE_MOCK_NOW,
    )

    expect(formOf(state)?.dueDate).toEqual(triageMockAt(17, 11, 45))
  })

  it('leaves Archive without a scheduled date or an expiry', () => {
    const state = withQuadrantPicked(
      opened,
      EisenhowerQuadrant.delete,
      TRIAGE_MOCK_NOW,
    )

    expect(formOf(state)?.dueDate).toBeNull()
    expect(formOf(state)?.expiry).toBeNull()
  })

  it('preserves a date the user already picked rather than reseeding it', () => {
    const picked = withDueDatePicked(opened, triageMockAt(20, 8))
    const state = withQuadrantPicked(
      picked,
      EisenhowerQuadrant.decide,
      TRIAGE_MOCK_NOW,
    )

    expect(formOf(state)?.dueDate).toEqual(triageMockAt(20, 8))
  })

  it('keeps the "a date implies an expiry" invariant true on every quadrant', () => {
    // Canon nests the expiry seed inside the due-date branch, which reads
    // narrower than the doc's "the Urgent column always forces both". The two
    // cannot be told apart, because no reachable state has a date without an
    // expiry — this asserts that, rather than the unreachable difference.
    for (const quadrant of [
      EisenhowerQuadrant.prioritize,
      EisenhowerQuadrant.decide,
      EisenhowerQuadrant.delegate,
      EisenhowerQuadrant.delete,
    ]) {
      const fresh = withQuadrantPicked(opened, quadrant, TRIAGE_MOCK_NOW)
      const prePicked = withQuadrantPicked(
        withDueDatePicked(opened, triageMockAt(20, 8)),
        quadrant,
        TRIAGE_MOCK_NOW,
      )

      for (const state of [fresh, prePicked]) {
        const form = formOf(state)
        if (form?.dueDate !== null) expect(form?.expiry).not.toBeNull()
      }
    }
  })

  it('bumps a low value to 3 when the quadrant is Important', () => {
    const state = withQuadrantPicked(
      opened,
      EisenhowerQuadrant.prioritize,
      TRIAGE_MOCK_NOW,
    )

    expect(formOf(state)?.value).toBe(3)
  })

  it('leaves the value alone when the quadrant is Not-Important', () => {
    const state = withQuadrantPicked(
      opened,
      EisenhowerQuadrant.delegate,
      TRIAGE_MOCK_NOW,
    )

    expect(formOf(state)?.value).toBe(1)
  })

  it('is a no-op with no session mounted — a tap after the screen popped', () => {
    expect(
      withQuadrantPicked(
        initialTriageState,
        EisenhowerQuadrant.decide,
        TRIAGE_MOCK_NOW,
      ),
    ).toBe(initialTriageState)
  })
})

// ---------------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------------

describe('withDurationPicked', () => {
  it('takes the first pick', () => {
    expect(formOf(withDurationPicked(opened, 45))?.durationMinutes).toBe(45)
  })

  it('takes a change of mind', () => {
    const state = withDurationPicked(withDurationPicked(opened, 45), 15)

    expect(formOf(state)?.durationMinutes).toBe(15)
  })

  it('REFUSES a revert to undefined once a chip has been picked', () => {
    const picked = withDurationPicked(opened, 45)
    const reverted = withDurationPicked(picked, null)

    expect(formOf(reverted)?.durationMinutes).toBe(45)
  })

  it('is a no-op with no session mounted', () => {
    expect(withDurationPicked(initialTriageState, 25)).toBe(initialTriageState)
  })
})

// ---------------------------------------------------------------------------
// Scheduled date and expiry
// ---------------------------------------------------------------------------

describe('withDueDatePicked', () => {
  it('seeds an expiry an hour later when none was set', () => {
    const state = withDueDatePicked(opened, triageMockAt(20, 8))

    expect(formOf(state)?.expiry).toEqual(triageMockAt(20, 9))
  })

  it('leaves an explicit expiry alone', () => {
    const withExpiry = withExpiryPicked(
      withDueDatePicked(opened, triageMockAt(20, 8)),
      triageMockAt(20, 18),
    )
    const moved = withDueDatePicked(withExpiry, triageMockAt(21, 8))

    expect(formOf(moved)?.expiry).toEqual(triageMockAt(20, 18))
  })

  it('permits clearing the date while an expiry stands — the one-sided case', () => {
    const scheduled = withDueDatePicked(opened, triageMockAt(20, 8))
    const cleared = withDueDatePicked(scheduled, null)

    expect(formOf(cleared)?.dueDate).toBeNull()
    expect(formOf(cleared)?.expiry).toEqual(triageMockAt(20, 9))
  })

  it('bumps the scroll nonce when seeding the expiry moves it', () => {
    const state = withDueDatePicked(opened, triageMockAt(20, 8))

    expect(state.session?.expiryScrollNonce).toBe(1)
  })
})

describe('withExpiryPicked', () => {
  it('takes an explicit pick', () => {
    const scheduled = withDueDatePicked(opened, triageMockAt(20, 8))
    const state = withExpiryPicked(scheduled, triageMockAt(20, 20))

    expect(formOf(state)?.expiry).toEqual(triageMockAt(20, 20))
  })

  it('SNAPS BACK to due + 1h when cleared with a scheduled date in place', () => {
    const scheduled = withDueDatePicked(opened, triageMockAt(20, 8))
    const cleared = withExpiryPicked(scheduled, null)

    expect(formOf(cleared)?.expiry).toEqual(triageMockAt(20, 9))
  })

  it('permits clearing when there is no scheduled date', () => {
    const expiryOnly = withExpiryPicked(opened, triageMockAt(20, 20))
    const cleared = withExpiryPicked(expiryOnly, null)

    expect(formOf(cleared)?.expiry).toBeNull()
  })

  it('bumps the scroll nonce only when the instant actually moves', () => {
    const scheduled = withDueDatePicked(opened, triageMockAt(20, 8))
    const before = scheduled.session?.expiryScrollNonce ?? 0
    const same = withExpiryPicked(scheduled, triageMockAt(20, 9))

    expect(same.session?.expiryScrollNonce).toBe(before)
  })
})

describe('withExpiryPresetTapped', () => {
  it('snaps to the computed preset moment — EoD on the scheduled day', () => {
    const scheduled = withDueDatePicked(opened, triageMockAt(20, 8))
    const state = withExpiryPresetTapped(scheduled, TriageExpiryPreset.endOfDay)

    expect(formOf(state)?.expiry).toEqual(triageMockAt(20, 23, 59))
  })

  it('is a no-op when the tapped preset already matches — no scroll either', () => {
    const scheduled = withDueDatePicked(opened, triageMockAt(20, 8))
    const nonce = scheduled.session?.expiryScrollNonce ?? 0
    const again = withExpiryPresetTapped(scheduled, TriageExpiryPreset.oneHour)

    expect(formOf(again)?.expiry).toEqual(triageMockAt(20, 9))
    expect(again.session?.expiryScrollNonce).toBe(nonce)
  })

  it('bumps the scroll nonce when the pill genuinely changes the expiry', () => {
    const scheduled = withDueDatePicked(opened, triageMockAt(20, 8))
    const nonce = scheduled.session?.expiryScrollNonce ?? 0
    const state = withExpiryPresetTapped(
      scheduled,
      TriageExpiryPreset.fourHours,
    )

    expect(state.session?.expiryScrollNonce).toBe(nonce + 1)
  })

  it('is a no-op with no scheduled date — there is nothing to offset from', () => {
    const state = withExpiryPresetTapped(opened, TriageExpiryPreset.endOfWeek)

    expect(formOf(state)?.expiry).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Reward, value and effort
// ---------------------------------------------------------------------------

describe('withRewardPointsStepped', () => {
  it('adds the fine grain below the threshold — 10 becomes 15', () => {
    expect(
      formOf(withRewardPointsStepped(opened, 'increment'))?.rewardPoints,
    ).toBe(15)
  })

  it('subtracts the fine grain below the threshold — 10 becomes 5', () => {
    expect(
      formOf(withRewardPointsStepped(opened, 'decrement'))?.rewardPoints,
    ).toBe(5)
  })

  it('clamps at the floor rather than reaching zero', () => {
    let state = opened
    for (let index = 0; index < 5; index += 1) {
      state = withRewardPointsStepped(state, 'decrement')
    }

    expect(formOf(state)?.rewardPoints).toBe(1)
  })

  it('is a no-op with no session mounted', () => {
    expect(withRewardPointsStepped(initialTriageState, 'increment')).toBe(
      initialTriageState,
    )
  })
})

describe('withRewardPointsPicked', () => {
  it('takes a direct value', () => {
    expect(formOf(withRewardPointsPicked(opened, 250))?.rewardPoints).toBe(250)
  })

  it('clamps a value above the ceiling', () => {
    expect(formOf(withRewardPointsPicked(opened, 4000))?.rewardPoints).toBe(999)
  })

  it('clamps a value below the floor', () => {
    expect(formOf(withRewardPointsPicked(opened, -3))?.rewardPoints).toBe(1)
  })
})

describe('withValueRatingTapped', () => {
  it('promotes a Not-Important quadrant when the rating reaches 3', () => {
    const delegated = withQuadrantPicked(
      opened,
      EisenhowerQuadrant.delegate,
      TRIAGE_MOCK_NOW,
    )
    const state = withValueRatingTapped(delegated, 3)

    expect(formOf(state)?.quadrant).toBe(EisenhowerQuadrant.prioritize)
    expect(formOf(state)?.value).toBe(3)
  })

  it('picks Schedule when no quadrant had been chosen yet', () => {
    const state = withValueRatingTapped(opened, 4)

    expect(formOf(state)?.quadrant).toBe(EisenhowerQuadrant.decide)
  })

  it('does NOT seed a due date when promoting by value — canon sets the field directly', () => {
    const state = withValueRatingTapped(opened, 4)

    expect(formOf(state)?.dueDate).toBeNull()
  })

  it('clears the rating when the lit rocket is tapped, leaving the quadrant', () => {
    const rated = withValueRatingTapped(opened, 4)
    const cleared = withValueRatingTapped(rated, 4)

    expect(formOf(cleared)?.value).toBeNull()
    expect(formOf(cleared)?.quadrant).toBe(EisenhowerQuadrant.decide)
  })

  it('never demotes — dropping to 1 rocket keeps the Important quadrant', () => {
    const rated = withValueRatingTapped(opened, 4)
    const lowered = withValueRatingTapped(rated, 1)

    expect(formOf(lowered)?.value).toBe(1)
    expect(formOf(lowered)?.quadrant).toBe(EisenhowerQuadrant.decide)
  })
})

describe('withEffortRatingTapped', () => {
  it('multiplies the reward when the rating increases — 1 fire to 3 triples it', () => {
    const state = withEffortRatingTapped(opened, 3)

    expect(formOf(state)?.effort).toBe(3)
    expect(formOf(state)?.rewardPoints).toBe(30)
  })

  it('leaves the reward alone when the rating decreases', () => {
    const raised = withEffortRatingTapped(opened, 4)
    const lowered = withEffortRatingTapped(raised, 2)

    expect(formOf(lowered)?.effort).toBe(2)
    expect(formOf(lowered)?.rewardPoints).toBe(
      formOf(raised)?.rewardPoints ?? null,
    )
  })

  it('leaves the reward alone when the rating is cleared', () => {
    const raised = withEffortRatingTapped(opened, 3)
    const cleared = withEffortRatingTapped(raised, 3)

    expect(formOf(cleared)?.effort).toBeNull()
    expect(formOf(cleared)?.rewardPoints).toBe(30)
  })

  it('takes no ratio against a cleared previous rating', () => {
    const cleared = withEffortRatingTapped(withEffortRatingTapped(opened, 3), 3)
    const raisedAgain = withEffortRatingTapped(cleared, 5)

    expect(formOf(raisedAgain)?.rewardPoints).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// The bottom action row
// ---------------------------------------------------------------------------

describe('withOutcomeRaised', () => {
  const scheduled = triageStateMocks.scheduled

  it('raises the completed outcome and pops the screen', () => {
    const state = withOutcomeRaised(scheduled, 'completed')

    expect(state.outcome?.kind).toBe('completed')
    expect(state.session).toBeNull()
  })

  it('refuses to confirm while the gate is closed — no quadrant picked', () => {
    expect(withOutcomeRaised(opened, 'completed')).toBe(opened)
  })

  it('dismisses whatever the gate says — cancel always works', () => {
    const state = withOutcomeRaised(opened, 'dismissed')

    expect(state.outcome).toEqual({ kind: 'dismissed' })
    expect(state.session).toBeNull()
  })

  it('raises an Edit request without applying a decision, keeping the screen', () => {
    const state = withOutcomeRaised(opened, 'editRequested')

    expect(state.outcome).toEqual({
      kind: 'editRequested',
      endeavorId: triageEndeavorFixtures.unscheduledTask.id,
    })
    expect(state.session).toBe(opened.session)
  })

  it('refuses Start Now on a Schedule triage — the quadrant guard', () => {
    expect(withOutcomeRaised(scheduled, 'startNow')).toBe(scheduled)
  })

  it('allows Start Now on a Prioritize triage', () => {
    const state = withOutcomeRaised(
      triageStateMocks.prioritizedOnBusyDay,
      'startNow',
    )

    expect(state.outcome?.kind).toBe('startNow')
  })

  it('carries the Kro-branded blurb on a Delegate share, keeping the screen', () => {
    const delegated = withQuadrantPicked(
      opened,
      EisenhowerQuadrant.delegate,
      TRIAGE_MOCK_NOW,
    )
    const state = withOutcomeRaised(delegated, 'shared')

    expect(state.outcome).toEqual({
      kind: 'shared',
      decision: expect.objectContaining({
        quadrant: EisenhowerQuadrant.delegate,
      }),
      text: 'I\'d like you to help with "Draft Q3 product plan". (Shared from Kro.)',
    })
    expect(state.session).toBe(delegated.session)
  })

  it('allows Archive with no date at all — the exempt quadrant', () => {
    const state = withOutcomeRaised(triageStateMocks.archivePicked, 'archived')

    expect(state.outcome?.kind).toBe('archived')
    expect(state.session).toBeNull()
  })

  it('is a no-op with no session mounted', () => {
    expect(withOutcomeRaised(initialTriageState, 'dismissed')).toBe(
      initialTriageState,
    )
  })
})

describe('withOutcomeCleared', () => {
  it('spends the one-shot', () => {
    const raised = withOutcomeRaised(opened, 'dismissed')

    expect(withOutcomeCleared(raised).outcome).toBeNull()
  })

  it('is a no-op when nothing is pending', () => {
    expect(withOutcomeCleared(opened)).toBe(opened)
  })

  it('leaves the session alone — an Edit request survives its acknowledgement', () => {
    const raised = withOutcomeRaised(opened, 'editRequested')
    const cleared = withOutcomeCleared(raised)

    expect(cleared.session).toBe(opened.session)
  })
})

describe('withShareSheetDismissed', () => {
  it('pops the Delegate triage’s screen', () => {
    const delegated = withQuadrantPicked(
      opened,
      EisenhowerQuadrant.delegate,
      TRIAGE_MOCK_NOW,
    )
    const shared = withOutcomeRaised(delegated, 'shared')

    expect(withShareSheetDismissed(shared).session).toBeNull()
  })

  it('is a no-op when no session is mounted', () => {
    expect(withShareSheetDismissed(initialTriageState)).toBe(initialTriageState)
  })

  it('leaves the save state alone — the decision is already on its way', () => {
    const saving = withSaveStarted(opened)

    expect(withShareSheetDismissed(saving).save.kind).toBe('saving')
  })
})

// ---------------------------------------------------------------------------
// The durable save
// ---------------------------------------------------------------------------

describe('withSaveStarted / withSaved / withSaveFailed', () => {
  it('moves into saving and clears any previous notice', () => {
    expect(withSaveStarted(triageStateMocks.savedPushDeferred).save.kind).toBe(
      'saving',
    )
  })

  it('lands a successful save with its push outcome attached', () => {
    const state = withSaved(withSaveStarted(opened), {
      push: { kind: 'notApplicable' },
      now: TRIAGE_MOCK_NOW,
    })

    expect(state.save).toEqual({
      kind: 'saved',
      push: { kind: 'notApplicable' },
      savedAt: TRIAGE_MOCK_NOW,
    })
  })

  it('reports a DEFERRED push as saved, not as failed — the offline guarantee', () => {
    expect(triageStateMocks.savedPushDeferred.save.kind).toBe('saved')
  })

  it('lands a local failure in the save lifecycle only', () => {
    const state = withSaveFailed(
      withSaveStarted(opened),
      TriageExceptions.localSaveFailed('quota'),
    )

    expect(state.save.kind).toBe('failed')
    expect(state.load.kind).toBe('loaded')
  })

  it('does not re-prompt on a failure — the outcome is left as raised', () => {
    const raised = withOutcomeRaised(triageStateMocks.scheduled, 'completed')
    const failed = withSaveFailed(
      withSaveStarted(raised),
      TriageExceptions.localSaveFailed('quota'),
    )

    expect(failed.outcome?.kind).toBe('completed')
  })
})
