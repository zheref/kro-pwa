/**
 * Shifters are pure: no store, no dispatch, no clock (`RC-56`). Every `State`
 * comes from `EndeavorDetailMocks` rather than being built inline (`RC-31`).
 */
import { EndeavorField, EndeavorRelation, EndeavorStatus } from '@kro/core'
import { describe, expect, it } from 'vitest'
import { EndeavorDetailExceptions } from '../EndeavorDetailException'
import {
  detailEndeavorMocks,
  detailStateMocks,
} from '../EndeavorDetailMocks'
import {
  withDestinationDismissed,
  withDetailDismissed,
  withDetailPresented,
  withDurationBoundAdjusted,
  withDurationBoundToggled,
  withEditRequested,
  withFieldChanged,
  withFieldEditRequested,
  withRelationDraft,
  withRelationManagementRequested,
  withRelationUpdated,
  withSaveFailed,
  withSaveStarted,
  withSaveSucceeded,
} from '../EndeavorDetailShifters'
import { DurationBound } from '../EndeavorDuration'

describe('presenting and dismissing Detail', () => {
  it('opens on the endeavor the caller already holds', () => {
    const next = withDetailPresented(detailStateMocks.closed, {
      endeavor: detailEndeavorMocks.task,
    })
    expect(next.endeavor).toBe(detailEndeavorMocks.task)
    expect(next.destination).toBeNull()
  })

  it('clears every draft left over from the previous endeavor', () => {
    const next = withDetailPresented(detailStateMocks.editingDirty, {
      endeavor: detailEndeavorMocks.event,
    })
    expect(next.edit).toBeNull()
    expect(next.duration).toBeNull()
    expect(next.relationDraft).toBeNull()
  })

  it('closes back to nothing at all', () => {
    expect(withDetailDismissed(detailStateMocks.editingDirty)).toEqual(
      detailStateMocks.closed,
    )
  })
})

describe('a Detail row tap opens the right editor, and only when allowed', () => {
  it('opens Edit focused on the tapped field', () => {
    const next = withFieldEditRequested(detailStateMocks.presentedTask, {
      field: EndeavorField.title,
    })
    expect(next.destination).toEqual({ kind: 'edit', focusedField: 'title' })
    expect(next.edit?.focusedField).toBe(EndeavorField.title)
  })

  it('routes `duration` to the Duration profile instead, seeding both drafts', () => {
    const next = withFieldEditRequested(detailStateMocks.presentedTask, {
      field: EndeavorField.duration,
    })
    expect(next.destination).toEqual({ kind: 'duration' })
    expect(next.duration).not.toBeNull()
    expect(next.edit).not.toBeNull()
  })

  it('opens nothing for a field the matrix refuses — the defensive backstop', () => {
    const next = withFieldEditRequested(detailStateMocks.presentedEvent, {
      field: EndeavorField.due,
    })
    expect(next.destination).toBeNull()
  })

  it('is a no-op when nothing is presented', () => {
    const next = withFieldEditRequested(detailStateMocks.closed, {
      field: EndeavorField.title,
    })
    expect(next).toBe(detailStateMocks.closed)
  })

  it('opens the full editor with no field in focus', () => {
    const next = withEditRequested(detailStateMocks.presentedTask, {})
    expect(next.destination).toEqual({ kind: 'edit', focusedField: null })
    expect(next.edit?.working).toBe(detailEndeavorMocks.task)
  })

  it('can open the editor on an endeavor handed in from another surface', () => {
    const next = withEditRequested(detailStateMocks.closed, {
      endeavor: detailEndeavorMocks.habit,
    })
    expect(next.endeavor).toBe(detailEndeavorMocks.habit)
    expect(next.destination).toEqual({ kind: 'edit', focusedField: null })
  })
})

describe('a relation’s manage affordance obeys the same matrix', () => {
  it('opens the relation screen for a kind that can manage it', () => {
    const next = withRelationManagementRequested(detailStateMocks.presentedTask, {
      relation: EndeavorRelation.performances,
    })
    expect(next.destination).toEqual({
      kind: 'relation',
      relation: EndeavorRelation.performances,
    })
  })

  it('opens performances read-only on a calendar event', () => {
    // Canon renders read-only relation screens with their "why" copy; only
    // the mutation path refuses. Opening must always succeed.
    const next = withRelationManagementRequested(
      detailStateMocks.presentedEvent,
      { relation: EndeavorRelation.performances },
    )
    expect(next.destination).toEqual({
      kind: 'relation',
      relation: EndeavorRelation.performances,
    })
  })

  it('opens hosts read-only on a habit', () => {
    const next = withRelationManagementRequested(detailStateMocks.presentedHabit, {
      relation: EndeavorRelation.hosts,
    })
    expect(next.destination).toEqual({
      kind: 'relation',
      relation: EndeavorRelation.hosts,
    })
  })

  it('clears the editor drafts when a relation screen takes over', () => {
    const next = withRelationManagementRequested(detailStateMocks.durationOpen, {
      relation: EndeavorRelation.performances,
    })
    expect(next.edit).toBeNull()
    expect(next.duration).toBeNull()
  })
})

describe('dismissing the presented editor discards the working copy', () => {
  it('drops the drafts without touching the presented endeavor', () => {
    const next = withDestinationDismissed(detailStateMocks.editingDirty)
    expect(next.endeavor).toBe(detailEndeavorMocks.task)
    expect(next.edit).toBeNull()
    expect(next.destination).toBeNull()
  })

  it('clears a stale save failure with it, so reopening starts clean', () => {
    expect(withDestinationDismissed(detailStateMocks.saveFailed).save).toEqual({
      kind: 'idle',
    })
  })

  it('is harmless when nothing was presented', () => {
    expect(withDestinationDismissed(detailStateMocks.presentedTask).edit).toBeNull()
  })
})

describe('field edits land on the working copy, never the presented one', () => {
  it('applies an allowed edit to the draft only', () => {
    const next = withFieldChanged(detailStateMocks.editingTask, {
      change: { field: 'title', value: 'Prepare the deck' },
    })
    expect(next.edit?.working.title).toBe('Prepare the deck')
    expect(next.endeavor?.title).toBe(detailEndeavorMocks.task.title)
  })

  it('leaves the draft identical when the matrix refuses the edit', () => {
    const editingEvent = withEditRequested(detailStateMocks.presentedEvent, {})
    const next = withFieldChanged(editingEvent, {
      change: { field: 'due', value: new Date(2026, 5, 20) },
    })
    expect(next.edit?.working).toBe(editingEvent.edit?.working)
  })

  it('supersedes a stale save failure, so the banner does not linger', () => {
    const next = withFieldChanged(detailStateMocks.saveFailed, {
      change: { field: 'status', value: EndeavorStatus.ongoing },
    })
    expect(next.save).toEqual({ kind: 'idle' })
  })

  it('is a no-op when no editor is open', () => {
    expect(
      withFieldChanged(detailStateMocks.presentedTask, {
        change: { field: 'title', value: 'x' },
      }),
    ).toBe(detailStateMocks.presentedTask)
  })
})

describe('the duration bounds and the working copy move together', () => {
  it('writes an enabled bound into the working copy', () => {
    const next = withDurationBoundToggled(detailStateMocks.durationOpen, {
      bound: DurationBound.minimum,
      isEnabled: true,
    })
    expect(next.duration?.isMinimumEnabled).toBe(true)
    expect(next.edit?.working.minimumDuration).toBe(
      next.duration?.minimumSeconds,
    )
  })

  it('writes null into the working copy for a disabled bound', () => {
    const enabled = withDurationBoundToggled(detailStateMocks.durationOpen, {
      bound: DurationBound.preferred,
      isEnabled: true,
    })
    const disabled = withDurationBoundToggled(enabled, {
      bound: DurationBound.preferred,
      isEnabled: false,
    })
    expect(disabled.edit?.working.duration).toBeNull()
  })

  it('carries a dialled number through to the working copy', () => {
    const enabled = withDurationBoundToggled(detailStateMocks.durationOpen, {
      bound: DurationBound.preferred,
      isEnabled: true,
    })
    const dialled = withDurationBoundAdjusted(enabled, {
      bound: DurationBound.preferred,
      seconds: 2400,
    })
    expect(dialled.edit?.working.duration).toBe(2400)
  })

  it('is a no-op when the Duration profile is not open', () => {
    expect(
      withDurationBoundAdjusted(detailStateMocks.editingTask, {
        bound: DurationBound.preferred,
        seconds: 900,
      }),
    ).toBe(detailStateMocks.editingTask)
  })
})

describe('the save lifecycle', () => {
  it('clears a stale failure when a fresh save starts', () => {
    expect(withSaveStarted(detailStateMocks.saveFailed).save).toEqual({
      kind: 'saving',
    })
  })

  it('adopts the persisted snapshot and resets the dirty baseline', () => {
    const saved = { ...detailEndeavorMocks.task, title: 'Prepare the deck' }
    const next = withSaveSucceeded(detailStateMocks.editingDirty, { saved })
    expect(next.endeavor).toBe(saved)
    expect(next.edit?.original).toBe(saved)
    expect(next.edit?.working).toBe(saved)
  })

  it('keeps a newer edit that raced ahead of the save, still dirty', () => {
    const raced = withFieldChanged(detailStateMocks.editingDirty, {
      change: { field: 'title', value: 'Even newer' },
    })
    const saved = { ...detailEndeavorMocks.task, title: 'Prepare the deck' }
    const next = withSaveSucceeded(raced, { saved })
    expect(next.edit?.working.title).toBe('Even newer')
    expect(next.edit?.original).toBe(saved)
  })

  it('leaves the working copy dirty when nothing was persisted', () => {
    const next = withSaveFailed(detailStateMocks.editingDirty, {
      exception: EndeavorDetailExceptions.localPersistenceFailed('disk full'),
    })
    expect(next.edit?.working.title).toBe('Prepare the deck')
    expect(next.save.kind).toBe('failed')
  })
})

describe('relation writes refresh Detail’s own copy', () => {
  it('adopts the refreshed endeavor', () => {
    const updated = { ...detailEndeavorMocks.task, sessionPoints: 12 }
    const next = withRelationUpdated(detailStateMocks.performancesOpen, {
      updated,
    })
    expect(next.endeavor).toBe(updated)
  })

  it('closes the add form the write came from', () => {
    const withForm = withRelationDraft(detailStateMocks.performancesOpen, {
      draft: { relation: 'defers', draft: { target: new Date(), reason: '' } },
    })
    const next = withRelationUpdated(withForm, {
      updated: detailEndeavorMocks.task,
    })
    expect(next.relationDraft).toBeNull()
  })

  it('leaves the relation screen itself open', () => {
    const next = withRelationUpdated(detailStateMocks.performancesOpen, {
      updated: detailEndeavorMocks.task,
    })
    expect(next.destination).toEqual({
      kind: 'relation',
      relation: 'performances',
    })
  })
})

describe('the relation add form', () => {
  it('opens a form', () => {
    const next = withRelationDraft(detailStateMocks.performancesOpen, {
      draft: { relation: 'hosts', host: null },
    })
    expect(next.relationDraft).toEqual({ relation: 'hosts', host: null })
  })

  it('cancels it', () => {
    const opened = withRelationDraft(detailStateMocks.performancesOpen, {
      draft: { relation: 'hosts', host: null },
    })
    expect(withRelationDraft(opened, { draft: null }).relationDraft).toBeNull()
  })

  it('clears a stale failure when the user starts composing again', () => {
    const next = withRelationDraft(detailStateMocks.saveFailed, {
      draft: { relation: 'hosts', host: null },
    })
    expect(next.save).toEqual({ kind: 'idle' })
  })
})
