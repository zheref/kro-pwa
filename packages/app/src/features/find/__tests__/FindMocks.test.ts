/**
 * The fixtures themselves.
 *
 * A mocks file that has quietly drifted is worse than none: every suite in this
 * feature builds its assertions on these, so the axes they claim to span are
 * asserted here rather than assumed.
 */
import { EndeavorKind, EndeavorStatus } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  FIND_REFERENCE_NOW,
  allFindEndeavorMocks,
  findAt,
  findEndeavorMocks,
  findStateMocks,
  nineOpenTasks,
} from '../FindMocks'

describe('the endeavor fixtures span the axes the surfaces filter on', () => {
  it('is built from a fixed instant, so nothing depends on when the suite runs', () => {
    expect(FIND_REFERENCE_NOW.getFullYear()).toBe(2026)
    expect(findAt(9, 30).getHours()).toBe(9)
  })

  it('covers three kinds — task, calendar event and habit', () => {
    const kinds = new Set(allFindEndeavorMocks.map((row) => row.kind))
    expect(kinds).toContain(EndeavorKind.task)
    expect(kinds).toContain(EndeavorKind.calendarEvent)
    expect(kinds).toContain(EndeavorKind.habit)
  })

  it('includes an archived row, so the Show Archived rule has something to reveal', () => {
    expect(findEndeavorMocks.archivedTask.status).toBe(EndeavorStatus.closed)
  })

  it('includes a multi-host row, so the "hide only when every host is hidden" rule bites', () => {
    expect(findEndeavorMocks.mirroredTask.hostedBy).toHaveLength(2)
  })

  it('includes an undated row, so the anytime band and the nil-last sort are exercised', () => {
    expect(findEndeavorMocks.undatedTask.due).toBeNull()
  })

  it('gives every fixture a distinct id', () => {
    const ids = allFindEndeavorMocks.map((row) => row.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('nineOpenTasks exists to exercise the seven-per-group limit', () => {
  it('is two rows past the limit — enough to prove both the cut and the count', () => {
    expect(nineOpenTasks).toHaveLength(9)
  })

  it('shares one status, so they land in one group', () => {
    expect(new Set(nineOpenTasks.map((row) => row.status)).size).toBe(1)
  })

  it('gives each row a distinct id and due time', () => {
    expect(new Set(nineOpenTasks.map((row) => row.id)).size).toBe(9)
    expect(new Set(nineOpenTasks.map((row) => row.due?.getTime())).size).toBe(9)
  })
})

describe('the state variants describe real situations', () => {
  it('has an idle variant with nothing installed', () => {
    expect(findStateMocks.idle.find.endeavors).toEqual([])
  })

  it('anchors every loaded variant to the reference instant', () => {
    expect(findStateMocks.loaded.find.clockAnchor).toEqual(FIND_REFERENCE_NOW)
    expect(findStateMocks.tasksLoaded.tasks.clockAnchor).toEqual(
      FIND_REFERENCE_NOW,
    )
  })

  it('keeps the rows through the failed variant, as the surface does', () => {
    expect(findStateMocks.failedAfterLoad.find.load.kind).toBe('failed')
    expect(
      findStateMocks.failedAfterLoad.find.endeavors.length,
    ).toBeGreaterThan(0)
  })

  it('hides every kind, host and status in the everythingHidden variant', () => {
    const { lens } = findStateMocks.everythingHidden.find
    expect(lens.hiddenKinds).toHaveLength(7)
    expect(lens.hiddenHosts).toHaveLength(6)
    expect(lens.hiddenStatuses).toHaveLength(10)
  })

  it('queues exactly one intent in the withPendingIntent variant', () => {
    expect(findStateMocks.withPendingIntent.intents).toHaveLength(1)
    expect(findStateMocks.withPendingIntent.nextIntentId).toBe(2)
  })
})
