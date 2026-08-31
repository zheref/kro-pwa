import { EndeavorHost, EndeavorKind, Month, WeekDay } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  CAPTURE_MOCK_NOW,
  captureDraftFixtures,
  captureEndeavorFixtures,
  captureFixturePool,
  captureMockAt,
} from '../CaptureMocks'
import {
  ADD_FOR_TODAY_ROUTE_DELAY_MS,
  ADD_FOR_TODAY_UNDO_WINDOW_MS,
  CAPTURE_INBOX_DELAY_MS,
  CAPTURE_PLAN_ROUTE_DELAY_MS,
  CaptureBlocker,
  CaptureDestination,
  type CaptureDraft,
  CaptureKind,
  type CaptureResult,
  LAST_USED_DESTINATION_KEY,
  MINIMUM_EVENT_DURATION_SECONDS,
  availableCaptureDestinations,
  canSubmitCapture,
  captureBlockedReason,
  captureBlocker,
  captureDestinationFromRawValue,
  captureDestinationLabel,
  captureIntentFor,
  captureKindLabel,
  captureKindPlaceholder,
  captureRecurrenceLabel,
  captureResultFromDraft,
  captureRouteFor,
  clampCaptureRewards,
  combineDateAndTime,
  defersAddedBySnapshot,
  endeavorFromCaptureResult,
  endeavorHostForDestination,
  endeavorKindForCaptureKind,
  isCaptureIntentDue,
  isCaptureResultValidForCreation,
  justCreatedEndeavor,
  lastUsedDestinationFromStored,
  makeCaptureDraft,
  nearestQuarterHourSlot,
  nextFreeSlotToday,
  nextQuarterHourSlot,
  pendingTriageEndeavors,
  repeatConfigFromCaptureRecurrence,
  scheduledForToday,
  schedulingIntentFor,
  schedulingSnapshotOf,
  unscheduledFromSnapshot,
} from '../CaptureRules'

// ---------------------------------------------------------------------------
// Kinds and destinations
// ---------------------------------------------------------------------------

const chipLabels = () =>
  [
    CaptureKind.task,
    CaptureKind.event,
    CaptureKind.reminder,
    CaptureKind.habit,
  ].map(captureKindLabel)

describe('the prompt kind vocabulary', () => {
  it('labels the four chips exactly as the iOS strip does', () => {
    expect(chipLabels()).toEqual(['Task', 'Event', 'Reminder', 'Habit'])
  })

  it('asks a different question per kind in the title field', () => {
    expect(captureKindPlaceholder(CaptureKind.task)).toBe(
      'What do you want to do?',
    )
    expect(captureKindPlaceholder(CaptureKind.habit)).toBe(
      'What habit do you want to build?',
    )
  })

  it('builds a calendar event from the Event chip and keeps every other name', () => {
    expect(endeavorKindForCaptureKind(CaptureKind.event)).toBe(
      EndeavorKind.calendarEvent,
    )
    expect(endeavorKindForCaptureKind(CaptureKind.task)).toBe(EndeavorKind.task)
    expect(endeavorKindForCaptureKind(CaptureKind.reminder)).toBe(
      EndeavorKind.reminder,
    )
    expect(endeavorKindForCaptureKind(CaptureKind.habit)).toBe(
      EndeavorKind.habit,
    )
  })
})

describe('hosting destinations', () => {
  it('shows Kro Cloud under its product name, not its vendor name', () => {
    expect(captureDestinationLabel(CaptureDestination.kroCloud)).toBe('Kro Cloud')
    expect(captureDestinationLabel(CaptureDestination.local)).toBe('On Device')
  })

  it('maps each destination onto the host that stores the endeavor', () => {
    expect(endeavorHostForDestination(CaptureDestination.kroCloud)).toBe(
      EndeavorHost.supabase,
    )
    expect(endeavorHostForDestination(CaptureDestination.local)).toBe(
      EndeavorHost.local,
    )
    expect(endeavorHostForDestination(CaptureDestination.appleCalendar)).toBe(
      EndeavorHost.appleCalendar,
    )
  })

  it('offers only On Device on a browser with no cloud flag', () => {
    expect(availableCaptureDestinations({})).toEqual([CaptureDestination.local])
  })

  it('appends Kro Cloud when supabase hosting is enabled', () => {
    expect(availableCaptureDestinations({ kroCloudEnabled: true })).toEqual([
      CaptureDestination.local,
      CaptureDestination.kroCloud,
    ])
  })

  it('falls back to On Device when the stored preference is unreadable', () => {
    expect(lastUsedDestinationFromStored('kroCloud')).toBe(
      CaptureDestination.kroCloud,
    )
    expect(lastUsedDestinationFromStored('dropbox')).toBe(
      CaptureDestination.local,
    )
    expect(lastUsedDestinationFromStored(null)).toBe(CaptureDestination.local)
    expect(lastUsedDestinationFromStored(42)).toBe(CaptureDestination.local)
  })

  it('remembers the destination outside the kro: preferences namespace', () => {
    // Canon stores it in bare `@AppStorage`, so a sign-out — which wipes only
    // `kro:` — leaves the user's last-used host alone.
    expect(LAST_USED_DESTINATION_KEY).toBe('lastEndeavorHostingDestination')
    expect(LAST_USED_DESTINATION_KEY.startsWith('kro:')).toBe(false)
  })

  it('narrows a raw value only when it names a real destination', () => {
    expect(captureDestinationFromRawValue('local')).toBe(
      CaptureDestination.local,
    )
    expect(captureDestinationFromRawValue('nope')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Validation — the truth table
// ---------------------------------------------------------------------------

describe('what blocks the Add button', () => {
  const table = [
    {
      scenario: 'a fresh Task prompt has no title yet',
      draft: captureDraftFixtures.emptyTask,
      blocker: CaptureBlocker.missingTitle,
      reason: 'Enter a title to add this task.',
    },
    {
      scenario: 'a Task titled with whitespace is still untitled',
      draft: captureDraftFixtures.whitespaceTask,
      blocker: CaptureBlocker.missingTitle,
      reason: 'Enter a title to add this task.',
    },
    {
      scenario: 'a titled Task needs no time at all',
      draft: captureDraftFixtures.titledTask,
      blocker: null,
      reason: null,
    },
    {
      scenario: 'a titled Reminder needs no time either',
      draft: captureDraftFixtures.titledReminder,
      blocker: null,
      reason: null,
    },
    {
      scenario: 'a titled Habit needs neither a date nor a time',
      draft: captureDraftFixtures.titledHabit,
      blocker: null,
      reason: null,
    },
    {
      scenario: 'an Event with neither time is blocked on both',
      draft: captureDraftFixtures.eventMissingBothTimes,
      blocker: CaptureBlocker.missingEventStartAndEnd,
      reason: 'Pick a start time and an end time to add this event.',
    },
    {
      scenario: 'an Event with only an end is blocked on the start',
      draft: captureDraftFixtures.eventMissingStart,
      blocker: CaptureBlocker.missingEventStart,
      reason: 'Pick a start time to add this event.',
    },
    {
      scenario: 'an Event with only a start is blocked on the end',
      draft: captureDraftFixtures.eventMissingEnd,
      blocker: CaptureBlocker.missingEventEnd,
      reason: 'Pick an end time to add this event.',
    },
    {
      scenario: 'an Event with both times may be added',
      draft: captureDraftFixtures.completeEvent,
      blocker: null,
      reason: null,
    },
    {
      scenario: 'an untitled Event reports the title first, not the times',
      draft: captureDraftFixtures.untitledCompleteEvent,
      blocker: CaptureBlocker.missingTitle,
      reason: 'Enter a title to add this event.',
    },
  ] as const

  for (const row of table) {
    it(`${row.scenario} → ${row.blocker ?? 'nothing blocks it'}`, () => {
      expect(captureBlocker(row.draft)).toBe(row.blocker)
      expect(captureBlockedReason(row.draft)).toBe(row.reason)
      expect(canSubmitCapture(row.draft)).toBe(row.blocker === null)
    })
  }
})

describe('the draft the prompt opens with', () => {
  it('offers the nearest quarter hour but commits to nothing', () => {
    const draft = makeCaptureDraft({
      kind: CaptureKind.task,
      now: CAPTURE_MOCK_NOW,
      destination: CaptureDestination.local,
    })

    expect(draft.hasTime).toBe(false)
    expect(draft.hasEndTime).toBe(false)
    expect(draft.time).toEqual(captureMockAt(17, 10, 0))
    expect(draft.date).toEqual(captureMockAt(17, 0, 0))
  })

  it('opens already scheduled when the timeline supplies a pressed slot', () => {
    const pressed = captureMockAt(17, 16, 30)
    const draft = makeCaptureDraft({
      kind: CaptureKind.event,
      now: CAPTURE_MOCK_NOW,
      initialStart: pressed,
      destination: CaptureDestination.local,
    })

    expect(draft.hasTime).toBe(true)
    expect(draft.hasEndTime).toBe(true)
    expect(draft.time).toEqual(pressed)
    expect(draft.endTime).toEqual(captureMockAt(17, 17, 30))
  })

  it('seeds the reward points at ten and clamps the stepper to 1…999', () => {
    const draft = makeCaptureDraft({
      kind: CaptureKind.task,
      now: CAPTURE_MOCK_NOW,
      destination: CaptureDestination.local,
    })

    expect(draft.rewards).toBe(10)
    expect(clampCaptureRewards(0)).toBe(1)
    expect(clampCaptureRewards(1000)).toBe(999)
    expect(clampCaptureRewards(25)).toBe(25)
  })
})

// ---------------------------------------------------------------------------
// Quarter-hour arithmetic
// ---------------------------------------------------------------------------

describe('the next quarter-hour slot Add for Today offers', () => {
  const table = [
    { from: captureMockAt(17, 10, 0, 0), slot: captureMockAt(17, 10, 15) },
    { from: captureMockAt(17, 10, 14, 59), slot: captureMockAt(17, 10, 15) },
    { from: captureMockAt(17, 10, 15, 0), slot: captureMockAt(17, 10, 30) },
    { from: captureMockAt(17, 10, 59, 0), slot: captureMockAt(17, 11, 0) },
  ] as const

  for (const row of table) {
    it(`offers ${row.slot.getHours()}:${String(row.slot.getMinutes()).padStart(2, '0')} at ${row.from.getHours()}:${String(row.from.getMinutes()).padStart(2, '0')}:${String(row.from.getSeconds()).padStart(2, '0')}`, () => {
      expect(nextQuarterHourSlot(row.from)).toEqual(row.slot)
    })
  }

  it('never offers a slot that has already begun', () => {
    for (const minute of [0, 1, 14, 15, 29, 30, 44, 45, 59]) {
      const from = captureMockAt(17, 10, minute)
      expect(nextQuarterHourSlot(from).getTime()).toBeGreaterThan(from.getTime())
    }
  })
})

describe('the nearest quarter hour the prompt seeds with', () => {
  it('rounds down below the halfway mark', () => {
    expect(nearestQuarterHourSlot(captureMockAt(17, 10, 7))).toEqual(
      captureMockAt(17, 10, 0),
    )
  })

  it('rounds up from the halfway mark', () => {
    expect(nearestQuarterHourSlot(captureMockAt(17, 10, 8))).toEqual(
      captureMockAt(17, 10, 15),
    )
  })

  it('leaves an instant already on the grain alone', () => {
    expect(nearestQuarterHourSlot(captureMockAt(17, 10, 30))).toEqual(
      captureMockAt(17, 10, 30),
    )
  })
})

describe('the first free gap Triage is seeded with', () => {
  it('is simply the next slot when the day is clear', () => {
    expect(nextFreeSlotToday([], CAPTURE_MOCK_NOW)).toEqual(
      captureMockAt(17, 10, 15),
    )
  })

  it('steps past an event that is running over the candidate slot', () => {
    const busy = [
      {
        ...captureEndeavorFixtures.eventToday,
        start: captureMockAt(17, 10, 0),
        duration: 3600,
      },
    ]
    expect(nextFreeSlotToday(busy, CAPTURE_MOCK_NOW)).toEqual(
      captureMockAt(17, 11, 0),
    )
  })

  it('keeps stepping when a later event contains the bumped candidate', () => {
    const busy = [
      {
        ...captureEndeavorFixtures.eventToday,
        id: 'first',
        start: captureMockAt(17, 10, 0),
        duration: 3600,
      },
      {
        ...captureEndeavorFixtures.eventToday,
        id: 'second',
        start: captureMockAt(17, 10, 45),
        duration: 3600,
      },
    ]
    expect(nextFreeSlotToday(busy, CAPTURE_MOCK_NOW)).toEqual(
      captureMockAt(17, 11, 45),
    )
  })

  it('never runs past the end of the day', () => {
    expect(nextFreeSlotToday([], captureMockAt(17, 23, 50))).toEqual(
      captureMockAt(17, 23, 59),
    )
  })
})

describe('combining the picked day with the picked time', () => {
  it('keeps the day and takes the hour and minute', () => {
    expect(
      combineDateAndTime(captureMockAt(18, 0, 0), captureMockAt(17, 9, 45)),
    ).toEqual(captureMockAt(18, 9, 45))
  })

  it('drops seconds so the stored instant sits on a clean minute', () => {
    expect(
      combineDateAndTime(captureMockAt(18, 0, 0), captureMockAt(17, 9, 45, 31)),
    ).toEqual(captureMockAt(18, 9, 45, 0))
  })

  it('is a no-op on a date that already carries that time', () => {
    expect(
      combineDateAndTime(captureMockAt(17, 9, 45), captureMockAt(17, 9, 45)),
    ).toEqual(captureMockAt(17, 9, 45))
  })
})

// ---------------------------------------------------------------------------
// Result → domain
// ---------------------------------------------------------------------------

describe('what a confirmed prompt emits', () => {
  it('refuses to emit anything while something blocks submission', () => {
    expect(captureResultFromDraft(captureDraftFixtures.emptyTask)).toBeNull()
    expect(
      captureResultFromDraft(captureDraftFixtures.eventMissingEnd),
    ).toBeNull()
  })

  it('trims the title and keeps only the fields the kind can carry', () => {
    const result = captureResultFromDraft({
      ...captureDraftFixtures.titledTask,
      title: '  Write the retro  ',
    })

    expect(result?.title).toBe('Write the retro')
    expect(result?.rewards).toBe(10)
    expect(result?.endTime).toBeNull()
  })

  it('drops a habit’s date and a reminder’s reward points', () => {
    expect(captureResultFromDraft(captureDraftFixtures.titledHabit)?.date).toBeNull()
    expect(
      captureResultFromDraft(captureDraftFixtures.titledReminder)?.rewards,
    ).toBeNull()
  })

  it('refuses an event result that is missing a boundary at the domain edge', () => {
    const result = resultOf(captureDraftFixtures.completeEvent)
    expect(isCaptureResultValidForCreation(result)).toBe(true)
    expect(isCaptureResultValidForCreation({ ...result, endTime: null })).toBe(
      false,
    )
  })
})

/** Fails the test rather than propagating a `null` a suite cannot assert on. */
const resultOf = (draft: CaptureDraft): CaptureResult => {
  const result = captureResultFromDraft(draft)
  if (result === null) throw new Error('the draft was expected to be valid')
  return result
}

describe('building the endeavor a capture stores', () => {
  const build = (draft: CaptureDraft) =>
    endeavorFromCaptureResult(resultOf(draft), {
      id: 'new-id',
      now: CAPTURE_MOCK_NOW,
    })

  it('stamps createdAt so the Inbox can sort the new row', () => {
    expect(build(captureDraftFixtures.titledTask).createdAt).toEqual(
      CAPTURE_MOCK_NOW,
    )
  })

  it('gives a task its due date only once a time is committed', () => {
    expect(build(captureDraftFixtures.titledTask).due).toEqual(
      captureMockAt(17, 0, 0),
    )
    expect(build(captureDraftFixtures.timedTask).due).toEqual(
      captureMockAt(17, 10, 0),
    )
  })

  it('gives an event a start and a duration, and never a due date', () => {
    const event = build({
      ...captureDraftFixtures.completeEvent,
      time: captureMockAt(17, 14, 0),
      endTime: captureMockAt(17, 15, 30),
    })

    expect(event.kind).toBe(EndeavorKind.calendarEvent)
    expect(event.start).toEqual(captureMockAt(17, 14, 0))
    expect(event.duration).toBe(5400)
    expect(event.due).toBeNull()
  })

  it('floors an event of no length at one minute rather than storing zero', () => {
    const event = build({
      ...captureDraftFixtures.completeEvent,
      time: captureMockAt(17, 14, 0),
      endTime: captureMockAt(17, 14, 0),
    })
    expect(event.duration).toBe(MINIMUM_EVENT_DURATION_SECONDS)
  })

  it('hosts the endeavor where the picker pointed', () => {
    const event = build({
      ...captureDraftFixtures.titledTask,
      destination: CaptureDestination.kroCloud,
    })
    expect(event.hostedBy).toEqual([EndeavorHost.supabase])
  })
})

describe('recurrence', () => {
  it('labels a plain rule by its name and an interval by its count', () => {
    expect(captureRecurrenceLabel({ kind: 'never' })).toBe('Never')
    expect(captureRecurrenceLabel({ kind: 'daily', interval: 1 })).toBe('Daily')
    expect(captureRecurrenceLabel({ kind: 'daily', interval: 3 })).toBe(
      'Every 3 days',
    )
  })

  it('produces no repeat configuration for a one-off endeavor', () => {
    expect(repeatConfigFromCaptureRecurrence({ kind: 'never' })).toBeNull()
  })

  it('carries the weekdays and the every-other multiplier into the domain', () => {
    const config = repeatConfigFromCaptureRecurrence({
      kind: 'weekly',
      interval: 2,
      weekdays: [WeekDay.monday, WeekDay.thursday],
    })

    expect(config).toEqual({
      base: { type: 'weekly', weekdays: [WeekDay.monday, WeekDay.thursday] },
      everyOther: 2,
    })
  })

  it('carries a yearly rule’s month and day', () => {
    expect(
      repeatConfigFromCaptureRecurrence({
        kind: 'yearly',
        interval: 1,
        month: Month.december,
        day: 25,
      }),
    ).toEqual({
      base: { type: 'yearly', day: 25, month: Month.december },
      everyOther: 1,
    })
  })
})

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

describe('where a capture sends the user', () => {
  it('routes an event to Plan: its day, in list mode, scrolled to and highlighted', () => {
    const route = captureRouteFor(captureEndeavorFixtures.eventToday)

    expect(route).toEqual({
      kind: 'plan',
      day: captureMockAt(17, 0, 0),
      scrollTarget: captureMockAt(17, 14, 0),
      endeavorId: 'event-today',
      highlight: true,
      listMode: true,
    })
  })

  it('never opens the Inbox for an event', () => {
    expect(captureRouteFor(captureEndeavorFixtures.eventToday).kind).not.toBe(
      'inbox',
    )
  })

  it('opens the Inbox for a task, a reminder and a habit alike', () => {
    for (const value of [
      captureEndeavorFixtures.freshTask,
      captureEndeavorFixtures.unscheduledReminder,
      captureEndeavorFixtures.unscheduledHabit,
    ]) {
      expect(captureRouteFor(value)).toEqual({
        kind: 'inbox',
        endeavorId: value.id,
      })
    }
  })

  it('never auto-navigates a non-event, even one due today', () => {
    expect(captureRouteFor(captureEndeavorFixtures.scheduledTask).kind).toBe(
      'inbox',
    )
  })

  it('falls back to the Inbox for an event with no start to scroll to', () => {
    expect(
      captureRouteFor(captureEndeavorFixtures.unscheduledEvent).kind,
    ).toBe('inbox')
  })

  it('waits the same half second before either route', () => {
    expect(CAPTURE_PLAN_ROUTE_DELAY_MS).toBe(500)
    expect(CAPTURE_INBOX_DELAY_MS).toBe(500)
    expect(
      captureIntentFor(captureEndeavorFixtures.eventToday, CAPTURE_MOCK_NOW)
        .deliverAfterMs,
    ).toBe(CAPTURE_PLAN_ROUTE_DELAY_MS)
    expect(
      captureIntentFor(captureEndeavorFixtures.freshTask, CAPTURE_MOCK_NOW)
        .deliverAfterMs,
    ).toBe(CAPTURE_INBOX_DELAY_MS)
  })

  it('switches to Plan immediately after an Add for Today, with no highlight', () => {
    const intent = schedulingIntentFor({
      endeavorId: 'fresh-task',
      scheduledAt: captureMockAt(17, 10, 15),
      now: CAPTURE_MOCK_NOW,
    })

    expect(intent.deliverAfterMs).toBe(ADD_FOR_TODAY_ROUTE_DELAY_MS)
    expect(intent.route).toEqual({
      kind: 'plan',
      day: captureMockAt(17, 0, 0),
      scrollTarget: captureMockAt(17, 10, 15),
      endeavorId: 'fresh-task',
      highlight: false,
      listMode: false,
    })
  })
})

describe('when the shell may perform a pending route', () => {
  const intent = captureIntentFor(
    captureEndeavorFixtures.freshTask,
    CAPTURE_MOCK_NOW,
  )

  it('is not due while the prompt is still dismissing', () => {
    expect(
      isCaptureIntentDue(intent, new Date(CAPTURE_MOCK_NOW.getTime() + 499)),
    ).toBe(false)
  })

  it('is due the instant the delay elapses', () => {
    expect(
      isCaptureIntentDue(intent, new Date(CAPTURE_MOCK_NOW.getTime() + 500)),
    ).toBe(true)
  })

  it('stays due afterwards, so a late delivery still lands', () => {
    expect(
      isCaptureIntentDue(intent, new Date(CAPTURE_MOCK_NOW.getTime() + 5_000)),
    ).toBe(true)
  })

  it('is due immediately when there is nothing to wait for', () => {
    const scheduling = schedulingIntentFor({
      endeavorId: 'fresh-task',
      scheduledAt: captureMockAt(17, 10, 15),
      now: CAPTURE_MOCK_NOW,
    })
    expect(isCaptureIntentDue(scheduling, CAPTURE_MOCK_NOW)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Inbox sections
// ---------------------------------------------------------------------------

describe('the Pending Triage section', () => {
  const rows = pendingTriageEndeavors(captureFixturePool, null)
  const ids = rows.map((row) => row.id)

  it('holds every unscheduled non-event endeavor regardless of age', () => {
    expect(ids).toContain('fresh-task')
    expect(ids).toContain('neglected-task')
    expect(ids).toContain('unscheduled-reminder')
    expect(ids).toContain('unscheduled-habit')
    expect(ids).toContain('undated-legacy-task')
  })

  it('excludes anything already scheduled, by start or by due date', () => {
    expect(ids).not.toContain('scheduled-task')
    expect(ids).not.toContain('started-task')
  })

  it('excludes completed and skipped work', () => {
    expect(ids).not.toContain('completed-task')
    expect(ids).not.toContain('skipped-task')
  })

  it('excludes calendar events even when they are unscheduled', () => {
    expect(ids).not.toContain('event-today')
    expect(ids).not.toContain('unscheduled-event')
  })

  it('sorts newest first and puts a row with no timestamp last', () => {
    expect(ids).toEqual([
      'fresh-task',
      'unscheduled-reminder',
      'unscheduled-habit',
      'neglected-task',
      'undated-legacy-task',
    ])
  })

  it('leaves the Just Created row out of the section it sits above', () => {
    const withJustCreated = pendingTriageEndeavors(
      captureFixturePool,
      'fresh-task',
    )
    expect(withJustCreated.map((row) => row.id)).not.toContain('fresh-task')
  })
})

describe('the Just Created row', () => {
  it('is the endeavor the capture named', () => {
    expect(justCreatedEndeavor(captureFixturePool, 'fresh-task')?.id).toBe(
      'fresh-task',
    )
  })

  it('is absent when the Inbox was opened by hand', () => {
    expect(justCreatedEndeavor(captureFixturePool, null)).toBeNull()
  })

  it('is absent for an id the pool no longer holds', () => {
    expect(justCreatedEndeavor(captureFixturePool, 'deleted-row')).toBeNull()
  })

  it('is never a calendar event, even if one is somehow named', () => {
    expect(justCreatedEndeavor(captureFixturePool, 'event-today')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Add for Today and its undo
// ---------------------------------------------------------------------------

describe('scheduling a row for today', () => {
  const target = captureEndeavorFixtures.freshTask
  const scheduledAt = captureMockAt(17, 10, 15)
  const scheduled = scheduledForToday(target, {
    scheduledAt,
    now: CAPTURE_MOCK_NOW,
  })

  it('moves the due date to the chosen slot', () => {
    expect(scheduled.due).toEqual(scheduledAt)
  })

  it('records why the row moved, so the history says "addForToday"', () => {
    expect(scheduled.defers).toHaveLength(1)
    expect(scheduled.defers[0]).toEqual({
      made: CAPTURE_MOCK_NOW,
      reason: 'addForToday',
      target: scheduledAt,
    })
  })

  it('schedules a habit too, whose due date is otherwise not editable', () => {
    const habit = scheduledForToday(captureEndeavorFixtures.unscheduledHabit, {
      scheduledAt,
      now: CAPTURE_MOCK_NOW,
    })
    expect(habit.due).toEqual(scheduledAt)
  })

  it('leaves the original untouched', () => {
    expect(target.due).toBeNull()
    expect(target.defers).toHaveLength(0)
  })
})

describe('undoing a scheduling', () => {
  const target = captureEndeavorFixtures.freshTask
  const scheduledAt = captureMockAt(17, 10, 15)
  const snapshot = schedulingSnapshotOf(target, scheduledAt)
  const scheduled = scheduledForToday(target, {
    scheduledAt,
    now: CAPTURE_MOCK_NOW,
  })

  it('restores an unscheduled row to unscheduled, not to some other time', () => {
    const restored = unscheduledFromSnapshot(scheduled, snapshot)
    expect(restored.due).toBeNull()
    expect(restored.start).toBeNull()
  })

  it('removes the audit entry the scheduling appended', () => {
    expect(defersAddedBySnapshot(scheduled, snapshot)).toHaveLength(1)
    expect(unscheduledFromSnapshot(scheduled, snapshot).defers).toHaveLength(0)
  })

  it('restores a row that did have a prior schedule to exactly that schedule', () => {
    const previouslyDue = captureEndeavorFixtures.scheduledTask
    const priorSnapshot = schedulingSnapshotOf(previouslyDue, scheduledAt)
    const moved = scheduledForToday(previouslyDue, {
      scheduledAt,
      now: CAPTURE_MOCK_NOW,
    })

    expect(unscheduledFromSnapshot(moved, priorSnapshot).due).toEqual(
      previouslyDue.due,
    )
  })

  it('keeps a defer the user made before the scheduling', () => {
    const withHistory = scheduledForToday(target, {
      scheduledAt: captureMockAt(17, 9, 0),
      now: captureMockAt(17, 8, 0),
    })
    const laterSnapshot = schedulingSnapshotOf(withHistory, scheduledAt)
    const movedAgain = scheduledForToday(withHistory, {
      scheduledAt,
      now: CAPTURE_MOCK_NOW,
    })

    expect(
      unscheduledFromSnapshot(movedAgain, laterSnapshot).defers,
    ).toHaveLength(1)
  })
})

describe('the undo window', () => {
  it('lasts about eight seconds, as the toast promises', () => {
    expect(ADD_FOR_TODAY_UNDO_WINDOW_MS).toBe(8_000)
  })
})
