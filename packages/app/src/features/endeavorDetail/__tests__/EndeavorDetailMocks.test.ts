/**
 * The fixtures themselves.
 *
 * The matrix suite is only as good as the kinds it runs against, so the spread
 * this file claims — task, calendar event, habit, blueprint — is asserted here
 * rather than assumed.
 */
import { EndeavorKind, EndeavorStatus } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  DETAIL_REFERENCE_NOW,
  allDetailEndeavorMocks,
  detailEndeavorMocks,
  detailStateMocks,
} from '../EndeavorDetailMocks'

describe('the endeavor fixtures span the kinds the matrix distinguishes', () => {
  it('is built from a fixed instant, so nothing depends on when the suite runs', () => {
    expect(DETAIL_REFERENCE_NOW.getFullYear()).toBe(2026)
  })

  it('covers a task, a calendar event, a habit and a blueprint', () => {
    const kinds = new Set(allDetailEndeavorMocks.map((row) => row.kind))
    expect(kinds).toContain(EndeavorKind.task)
    expect(kinds).toContain(EndeavorKind.calendarEvent)
    expect(kinds).toContain(EndeavorKind.habit)
    expect(kinds).toContain(EndeavorKind.blueprint)
  })

  it('carries exactly the empirical sample minimum on the sessions fixture', () => {
    expect(detailEndeavorMocks.taskWithSessions.performances).toHaveLength(3)
  })

  it('carries one short of it on the locked fixture', () => {
    expect(detailEndeavorMocks.taskWithOneSession.performances).toHaveLength(1)
  })

  it('includes a mirrored endeavor, so the shadows list has something in it', () => {
    expect(detailEndeavorMocks.event.shadows).toHaveLength(1)
  })

  it('includes a blank-titled row, so the one validation rule has a failing case', () => {
    expect(detailEndeavorMocks.untitled.title.trim()).toBe('')
  })

  it('gives every fixture a distinct id', () => {
    const ids = allDetailEndeavorMocks.map((row) => row.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('the state variants describe real situations', () => {
  it('has a closed variant that presents nothing', () => {
    expect(detailStateMocks.closed.endeavor).toBeNull()
  })

  it('has a clean editor and a dirty one', () => {
    expect(detailStateMocks.editingTask.edit?.working).toBe(
      detailStateMocks.editingTask.edit?.original,
    )
    expect(detailStateMocks.editingDirty.edit?.working).not.toBe(
      detailStateMocks.editingDirty.edit?.original,
    )
  })

  it('has an invalid variant whose working title is blank', () => {
    expect(detailStateMocks.editingInvalid.edit?.working.title).toBe('')
  })

  it('has a failed save that kept the user’s edit', () => {
    expect(detailStateMocks.saveFailed.save.kind).toBe('failed')
    expect(detailStateMocks.saveFailed.edit?.working.title).toBe(
      'Prepare the deck',
    )
  })

  it('has an editable and a read-only relation variant', () => {
    expect(detailStateMocks.performancesOpen.endeavor?.kind).toBe(
      EndeavorKind.task,
    )
    expect(detailStateMocks.performancesReadOnly.endeavor?.kind).toBe(
      EndeavorKind.calendarEvent,
    )
  })

  it('keeps the presented endeavor’s status intact across the variants', () => {
    expect(detailStateMocks.presentedTask.endeavor?.status).toBe(
      EndeavorStatus.pending,
    )
  })
})
