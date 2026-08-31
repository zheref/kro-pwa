/**
 * The `with…` helpers, and issue #7 acceptance criterion 2: they refuse
 * kind-irrelevant edits.
 *
 * A refusal is asserted with `toBe` (reference identity), not `toEqual`. That
 * is the stronger claim and the one callers rely on: an equal-but-new object
 * would still invalidate a memoized selector and re-render a list.
 */
import { describe, expect, it } from 'vitest'
import { makeProject } from '../../shared/EndeavorList'
import { deferMocks, performMocks, shadowMocks } from '../__mocks__/EndeavorRelations.mocks'
import { endeavorMocks } from '../__mocks__/Endeavor.mocks'
import { makeEndeavor } from '../Endeavor'
import { EndeavorHost } from '../EndeavorHost'
import { EndeavorKind } from '../EndeavorKind'
import { EndeavorStatus } from '../EndeavorStatus'
import { EndeavorTag } from '../EndeavorTag'
import {
  undrafted,
  withAddedDefer,
  withAddedHost,
  withAddedPerformance,
  withAddedShadow,
  withAssociatedColor,
  withCompleted,
  withDeferred,
  withDue,
  withDuration,
  withDurationProfile,
  withEffort,
  withExpiry,
  withId,
  withKind,
  withProject,
  withRemovedDefer,
  withRemovedHost,
  withRemovedPerformance,
  withRemovedShadow,
  withRepeatConfig,
  withRescheduled,
  withSessionPoints,
  withStart,
  withStatus,
  withTags,
  withTitle,
  withUpdatedPerformance,
  withValue,
} from '../EndeavorMutations'
import { dailyBase, makeRepeatConfig } from '../RepeatConfig'

const DATE = new Date(2026, 0, 20, 9, 0, 0)

const task = endeavorMocks.plannedTask
const event = endeavorMocks.todayEvent
const habit = endeavorMocks.weekdayHabit
const blueprint = endeavorMocks.blockedBlueprint

// ---------------------------------------------------------------------------
// AC 2 — the matrix no-op proofs
// ---------------------------------------------------------------------------

describe('AC 2: relation helpers no-op when the matrix refuses the kind', () => {
  it('adding a defer to a calendarEvent returns the very same object', () => {
    expect(withAddedDefer(event, deferMocks.noReason)).toBe(event)
  })

  it('adding a defer to a habit returns the very same object', () => {
    expect(withAddedDefer(habit, deferMocks.noReason)).toBe(habit)
  })

  it('removing a defer from a calendarEvent is a no-op even at a valid index', () => {
    const eventWithDefers = { ...event, defers: [deferMocks.noReason] }
    expect(withRemovedDefer(eventWithDefers, 0)).toBe(eventWithDefers)
  })

  it('deferring a calendarEvent changes neither `due` nor the history', () => {
    const result = withDeferred(event, { target: DATE, made: DATE })
    expect(result).toBe(event)
    expect(result.due).toBeNull()
    expect(result.defers).toEqual([])
  })

  it('adding a performance to a calendarEvent is a no-op', () => {
    expect(withAddedPerformance(event, performMocks.completedPomodoro)).toBe(event)
  })

  it('adding a performance to a blueprint is a no-op', () => {
    expect(withAddedPerformance(blueprint, performMocks.completedPomodoro)).toBe(
      blueprint,
    )
  })

  it('removing a host from a habit is a no-op even when the host is present', () => {
    expect(withRemovedHost(habit, EndeavorHost.supabase)).toBe(habit)
    expect(habit.hostedBy).toContain(EndeavorHost.supabase)
  })

  it('removing a shadow from a habit is a no-op even at a valid index', () => {
    const shadowedHabit = { ...habit, shadows: [shadowMocks.appleHabit] }
    expect(withRemovedShadow(shadowedHabit, 0)).toBe(shadowedHabit)
  })
})

describe('AC 2: field helpers no-op when the matrix refuses the kind', () => {
  it('setting a due date on a habit is a no-op', () => {
    expect(withDue(habit, DATE)).toBe(habit)
  })

  it('setting a due date on a calendarEvent is a no-op', () => {
    expect(withDue(event, DATE)).toBe(event)
  })

  it('setting a start or duration on a blueprint is a no-op', () => {
    expect(withStart(blueprint, DATE)).toBe(blueprint)
    expect(withDuration(blueprint, 900)).toBe(blueprint)
    expect(withRescheduled(blueprint, DATE, 900)).toBe(blueprint)
    expect(
      withDurationProfile(blueprint, {
        preferred: 900,
        minimum: null,
        maximum: null,
      }),
    ).toBe(blueprint)
  })

  it('setting session points on a calendarEvent is a no-op', () => {
    expect(withSessionPoints(event, 50)).toBe(event)
  })

  it('setting session points on a blueprint is a no-op', () => {
    expect(withSessionPoints(blueprint, 50)).toBe(blueprint)
  })
})

// ---------------------------------------------------------------------------
// The permitted edits
// ---------------------------------------------------------------------------

describe('withDue', () => {
  it('replaces `due` on a kind that has one', () => {
    expect(withDue(task, DATE).due).toEqual(DATE)
  })

  it('clears `due` when given null', () => {
    expect(withDue(task, null).due).toBeNull()
  })

  it('records NO defer — that is `withDeferred`’s job', () => {
    expect(withDue(task, DATE).defers).toEqual(task.defers)
  })

  it('leaves the original untouched', () => {
    const before = task.due
    withDue(task, DATE)
    expect(task.due).toBe(before)
  })
})

describe('withDeferred', () => {
  it('moves `due` to the target', () => {
    expect(withDeferred(task, { target: DATE, made: DATE }).due).toEqual(DATE)
  })

  it('appends exactly one audit entry', () => {
    const result = withDeferred(task, {
      target: DATE,
      made: DATE,
      reason: 'Bank closed',
    })
    expect(result.defers).toHaveLength(task.defers.length + 1)
    expect(result.defers.at(-1)).toEqual({
      made: DATE,
      reason: 'Bank closed',
      target: DATE,
    })
  })

  it('defaults the reason to null when none is given', () => {
    expect(withDeferred(task, { target: DATE, made: DATE }).defers.at(-1)?.reason).toBeNull()
  })

  it('keeps earlier deferrals in order', () => {
    const twice = withDeferred(
      withDeferred(task, { target: DATE, made: DATE, reason: 'first' }),
      { target: DATE, made: DATE, reason: 'second' },
    )
    expect(twice.defers.map((entry) => entry.reason)).toEqual(['first', 'second'])
  })
})

describe('withAddedDefer / withRemovedDefer', () => {
  it('appends history without touching `due`', () => {
    const result = withAddedDefer(task, deferMocks.oneDayWithReason)
    expect(result.defers.at(-1)).toEqual(deferMocks.oneDayWithReason)
    expect(result.due).toEqual(task.due)
  })

  it('removes the entry at the given index', () => {
    const seeded = withAddedDefer(
      withAddedDefer(task, deferMocks.noReason),
      deferMocks.nextWeek,
    )
    expect(withRemovedDefer(seeded, 0).defers).toEqual([
      ...task.defers,
      deferMocks.nextWeek,
    ])
  })

  it('no-ops on an out-of-bounds index rather than throwing', () => {
    const seeded = withAddedDefer(task, deferMocks.noReason)
    expect(withRemovedDefer(seeded, 99)).toBe(seeded)
    expect(withRemovedDefer(seeded, -1)).toBe(seeded)
  })
})

describe('performance helpers', () => {
  it('appends a performance to a task', () => {
    const result = withAddedPerformance(task, performMocks.completedPomodoro)
    expect(result.performances).toEqual([performMocks.completedPomodoro])
  })

  it('replaces the performance at an index', () => {
    const seeded = withAddedPerformance(task, performMocks.abortedEarly)
    const updated = withUpdatedPerformance(seeded, 0, performMocks.completedPomodoro)
    expect(updated.performances).toEqual([performMocks.completedPomodoro])
  })

  it('removes the performance at an index', () => {
    const seeded = withAddedPerformance(
      withAddedPerformance(task, performMocks.abortedEarly),
      performMocks.completedPomodoro,
    )
    expect(withRemovedPerformance(seeded, 0).performances).toEqual([
      performMocks.completedPomodoro,
    ])
  })

  it('no-ops on an out-of-bounds index for both update and remove', () => {
    expect(withUpdatedPerformance(task, 5, performMocks.abortedEarly)).toBe(task)
    expect(withRemovedPerformance(task, 0)).toBe(task)
  })
})

describe('host helpers', () => {
  it('appends a host, unguarded — canon leaves ingestion open', () => {
    // Deliberate asymmetry: `withAddedHost` has no matrix guard in canon,
    // because reconciliation writes hosts regardless of kind.
    expect(withAddedHost(habit, EndeavorHost.appleReminders).hostedBy).toEqual([
      EndeavorHost.supabase,
      EndeavorHost.appleReminders,
    ])
  })

  it('removes EVERY occurrence of a host on a permitted kind', () => {
    const doubled = withAddedHost(task, EndeavorHost.supabase)
    expect(withRemovedHost(doubled, EndeavorHost.supabase).hostedBy).toEqual([
      EndeavorHost.local,
    ])
  })

  it('no-ops when the host is not present at all', () => {
    expect(withRemovedHost(task, EndeavorHost.outlookCalendar)).toBe(task)
  })
})

describe('shadow helpers', () => {
  it('appends a shadow to an endeavor that had none, starting the array', () => {
    const result = withAddedShadow(task, shadowMocks.googleEvent)
    expect(result.shadows).toEqual([shadowMocks.googleEvent])
  })

  it('normalizes back to null when the last shadow is removed', () => {
    const single = withAddedShadow(task, shadowMocks.googleEvent)
    expect(withRemovedShadow(single, 0).shadows).toBeNull()
  })

  it('keeps an array when shadows remain', () => {
    const two = withAddedShadow(
      withAddedShadow(task, shadowMocks.googleEvent),
      shadowMocks.appleTask,
    )
    expect(withRemovedShadow(two, 0).shadows).toEqual([shadowMocks.appleTask])
  })

  it('no-ops on an out-of-bounds index and on a null shadow list', () => {
    expect(withRemovedShadow(task, 0)).toBe(task)
    const single = withAddedShadow(task, shadowMocks.googleEvent)
    expect(withRemovedShadow(single, 7)).toBe(single)
  })
})

describe('unguarded ingestion helpers', () => {
  it('withId replaces the identifier for any kind', () => {
    expect(withId(event, 'endeavor-renamed').id).toBe('endeavor-renamed')
  })

  it('withKind re-classifies despite isKindEditable being false for users', () => {
    expect(withKind(task, EndeavorKind.habit).kind).toBe(EndeavorKind.habit)
  })

  it('withKind preserves every other native and Kro-enriched field', () => {
    const reclassified = withKind(task, EndeavorKind.reminder)
    expect(reclassified.value).toBe(task.value)
    expect(reclassified.effort).toBe(task.effort)
    expect(reclassified.sessionPoints).toBe(task.sessionPoints)
    expect(reclassified.hostedBy).toEqual(task.hostedBy)
  })

  it('withCompleted stamps a completion without touching status', () => {
    const result = withCompleted(task, DATE)
    expect(result.completed).toEqual(DATE)
    expect(result.status).toBe(task.status)
  })

  it('withCompleted works on a calendarEvent too — it is not a user edit', () => {
    expect(withCompleted(event, DATE).completed).toEqual(DATE)
  })
})

describe('core and enrichment setters', () => {
  it('withTitle and withStatus apply to every kind', () => {
    expect(withTitle(blueprint, 'Renamed').title).toBe('Renamed')
    expect(withStatus(blueprint, EndeavorStatus.closed).status).toBe(
      EndeavorStatus.closed,
    )
  })

  it('withValue, withEffort and withExpiry apply to every kind', () => {
    expect(withValue(blueprint, 4).value).toBe(4)
    expect(withEffort(blueprint, 2).effort).toBe(2)
    expect(withExpiry(blueprint, DATE).expiry).toEqual(DATE)
  })

  it('withExpiry never touches `due` — expiry is not a due date', () => {
    const result = withExpiry(task, DATE)
    expect(result.expiry).toEqual(DATE)
    expect(result.due).toEqual(task.due)
  })

  it('withTags accepts null to restore "never tagged"', () => {
    expect(withTags(task, [EndeavorTag.engaging]).tags).toEqual([EndeavorTag.engaging])
    expect(withTags(task, null).tags).toBeNull()
    expect(withTags(task, []).tags).toEqual([])
  })

  it('withAssociatedColor sets and clears the hex', () => {
    expect(withAssociatedColor(task, '#FF0000').associatedColor).toBe('#FF0000')
    expect(withAssociatedColor(task, null).associatedColor).toBeNull()
  })

  it('withProject sets projectId and list together, as one assignment', () => {
    const project = makeProject({ id: 'project-new', title: 'New' })
    const result = withProject(task, { projectId: project.id, list: project })
    expect(result.projectId).toBe('project-new')
    expect(result.list).toBe(project)
  })

  it('withRepeatConfig sets and clears the rule on every kind', () => {
    const rule = makeRepeatConfig(dailyBase())
    expect(withRepeatConfig(blueprint, rule).repeatConfig).toBe(rule)
    expect(withRepeatConfig(task, null).repeatConfig).toBeNull()
  })
})

describe('withDurationProfile', () => {
  it('replaces all three duration values at once', () => {
    const result = withDurationProfile(task, {
      preferred: 1200,
      minimum: 600,
      maximum: 2400,
    })
    expect(result.duration).toBe(1200)
    expect(result.minimumDuration).toBe(600)
    expect(result.maximumDuration).toBe(2400)
  })

  it('clears the bounds when handed nulls', () => {
    const result = withDurationProfile(task, {
      preferred: null,
      minimum: null,
      maximum: null,
    })
    expect(result.duration).toBeNull()
    expect(result.minimumDuration).toBeNull()
    expect(result.maximumDuration).toBeNull()
  })

  it('leaves every unrelated field alone', () => {
    const result = withDurationProfile(task, {
      preferred: 60,
      minimum: null,
      maximum: null,
    })
    expect(result.value).toBe(task.value)
    expect(result.list).toBe(task.list)
    expect(result.defers).toBe(task.defers)
  })
})

describe('undrafted', () => {
  it('clears the draft flag — canon’s own version never did', () => {
    // Canon: `var copy = self; copy.isDraft = false; return self` returns
    // `self`, so the flag survives. This port returns the cleared copy.
    expect(undrafted(endeavorMocks.bareDraft).isDraft).toBe(false)
  })

  it('is a no-op on something that was never a draft', () => {
    expect(undrafted(task)).toBe(task)
  })

  it('changes nothing else', () => {
    const result = undrafted(endeavorMocks.bareDraft)
    expect({ ...result, isDraft: true }).toEqual(endeavorMocks.bareDraft)
  })
})

describe('immutability', () => {
  it('never mutates the endeavor it was given', () => {
    const original = makeEndeavor({
      id: 'endeavor-immutability',
      title: 'Original',
      kind: EndeavorKind.task,
    })
    const snapshot = JSON.stringify(original)
    withTitle(original, 'Changed')
    withAddedDefer(original, deferMocks.noReason)
    withAddedPerformance(original, performMocks.manualEntry)
    withAddedHost(original, EndeavorHost.supabase)
    withAddedShadow(original, shadowMocks.googleEvent)
    expect(JSON.stringify(original)).toBe(snapshot)
  })

  it('never shares a relation array with the value it derived from', () => {
    const result = withAddedDefer(task, deferMocks.noReason)
    expect(result.defers).not.toBe(task.defers)
  })

  it('returns a NEW object for every permitted edit', () => {
    expect(withTitle(task, 'Changed')).not.toBe(task)
    expect(withValue(task, 1)).not.toBe(task)
  })
})
