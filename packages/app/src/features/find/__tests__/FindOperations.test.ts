/**
 * The **capability-coverage** suite (acceptance criterion 1) plus the operation
 * catalog's own rules.
 *
 * The coverage assertion walks the vista registry — every fixed vista *and* the
 * two parameterized ones — collects the operations they declare, and demands a
 * binding for each. It is written against the registry rather than a hand-kept
 * list precisely so that a capability added to a vista in `@kro/core` fails here
 * rather than reaching a user as a dead gesture.
 */
import type { EndeavorsVista } from '@kro/core'
import {
  EndeavorKind,
  EndeavorOperation,
  EndeavorStatus,
  EndeavorsVistas,
  endeavorOperations,
  fixedEndeavorsVistas,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  OperationEffect,
  OperationHandling,
  endeavorAfterOperation,
  findOperationBinding,
  findOperationBindings,
  isIntentOperation,
  isLocallyHandledOperation,
  isRemovingOperation,
  unboundOperations,
  unboundVistaOperations,
  vistaDeclaredOperations,
} from '../FindOperations'
import { FIND_REFERENCE_NOW, findEndeavorMocks } from '../FindMocks'

/** Every vista the app can install, including the two parameterized ones. */
const everyVista: readonly EndeavorsVista[] = [
  ...fixedEndeavorsVistas,
  EndeavorsVistas.tasksForList('list-1'),
  EndeavorsVistas.tasksForSearch('slides'),
]

describe('capability coverage — no vista-declared operation is unbound', () => {
  it('binds every operation the whole vista registry declares', () => {
    expect(unboundVistaOperations(everyVista)).toEqual([])
  })

  it('binds every operation in the closed catalog, not only the declared ones', () => {
    expect(unboundOperations()).toEqual([])
  })

  it('reports the operations the registry actually declares, de-duplicated', () => {
    const declared = vistaDeclaredOperations(everyVista)
    expect(declared).toContain(EndeavorOperation.markComplete)
    expect(declared).toContain(EndeavorOperation.viewDetail)
    expect(new Set(declared).size).toBe(declared.length)
  })

  it('gives every declared operation a handling and a destination', () => {
    for (const operation of vistaDeclaredOperations(everyVista)) {
      const binding = findOperationBinding(operation)
      if (binding.handling === OperationHandling.local) {
        expect(binding.effect).not.toBeNull()
      } else {
        expect(binding.consumer).not.toBeNull()
      }
    }
  })

  it('covers the Find vista in particular — the surface that exercises them all', () => {
    const declared = vistaDeclaredOperations([EndeavorsVistas.find])
    expect(declared).toEqual([
      EndeavorOperation.startSession,
      EndeavorOperation.edit,
      EndeavorOperation.delete,
      EndeavorOperation.archive,
      EndeavorOperation.viewDetail,
    ])
    expect(unboundVistaOperations([EndeavorsVistas.find])).toEqual([])
  })
})

describe('the catalog splits local writes from cross-feature intents', () => {
  it('persists the six row mutations itself', () => {
    expect(isLocallyHandledOperation(EndeavorOperation.markComplete)).toBe(true)
    expect(isLocallyHandledOperation(EndeavorOperation.delete)).toBe(true)
    expect(isLocallyHandledOperation(EndeavorOperation.unarchive)).toBe(true)
  })

  it('hands a focus session, a triage and a detail tap to their owners', () => {
    expect(isIntentOperation(EndeavorOperation.startSession)).toBe(true)
    expect(isIntentOperation(EndeavorOperation.triage)).toBe(true)
    expect(isIntentOperation(EndeavorOperation.viewDetail)).toBe(true)
  })

  it('names a consumer for every intent, so nothing is silently dropped', () => {
    for (const operation of endeavorOperations) {
      const binding = findOperationBindings[operation]
      if (binding.handling !== OperationHandling.intent) continue
      expect(binding.consumer?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('performs the share itself now that the capability is a Service', () => {
    // It was an intent naming "share Service (not wired yet)" until
    // KC-IS-#71 item 18 wired one. `local` is the right handling because Find
    // performs the hand-off rather than parking it for another surface — the
    // distinction the flag actually carries — even though it writes nothing.
    expect(isLocallyHandledOperation(EndeavorOperation.share)).toBe(true)
    expect(isRemovingOperation(EndeavorOperation.share)).toBe(false)
  })

  it('marks only delete as the operation that removes the row', () => {
    const removing = endeavorOperations.filter(isRemovingOperation)
    expect(removing).toEqual([EndeavorOperation.delete])
  })
})

describe('endeavorAfterOperation is the one definition of each local effect', () => {
  const task = findEndeavorMocks.morningTask
  const request = (
    operation: EndeavorOperation,
    extra: Record<string, unknown> = {},
  ) =>
    ({
      surface: 'find' as const,
      operation,
      endeavorId: task.id,
      now: FIND_REFERENCE_NOW,
      ...extra,
    }) as Parameters<typeof endeavorAfterOperation>[1]

  it('closes the row and stamps the backdated completion the user chose', () => {
    const backdated = new Date(2026, 5, 17, 22, 0, 0)
    const done = endeavorAfterOperation(
      task,
      request(EndeavorOperation.markComplete, { completionDate: backdated }),
    )
    expect(done.status).toBe(EndeavorStatus.closed)
    expect(done.completed).toEqual(backdated)
  })

  it('falls back to now when no backdate was given', () => {
    const done = endeavorAfterOperation(
      task,
      request(EndeavorOperation.markComplete),
    )
    expect(done.completed).toEqual(FIND_REFERENCE_NOW)
  })

  it('archives by closing the row WITHOUT a completion stamp', () => {
    const archived = endeavorAfterOperation(
      task,
      request(EndeavorOperation.archive),
    )
    expect(archived.status).toBe(EndeavorStatus.closed)
    expect(archived.completed).toBeNull()
  })

  it('reopens a completed row and clears its completion timestamp', () => {
    const closed = endeavorAfterOperation(
      task,
      request(EndeavorOperation.markComplete),
    )
    const reopened = endeavorAfterOperation(
      closed,
      request(EndeavorOperation.markIncomplete),
    )
    expect(reopened.status).toBe(EndeavorStatus.pending)
    expect(reopened.completed).toBeNull()
  })

  it('defers a task by moving due and appending the audit entry', () => {
    const target = new Date(2026, 5, 19, 9, 0, 0)
    const deferred = endeavorAfterOperation(
      task,
      request(EndeavorOperation.defer, {
        deferTarget: target,
        deferReason: 'blocked on review',
      }),
    )
    expect(deferred.due).toEqual(target)
    expect(deferred.defers).toHaveLength(1)
    expect(deferred.defers[0]?.reason).toBe('blocked on review')
  })

  it('refuses to defer a calendar event — the matrix says it has no due date', () => {
    const event = makeEndeavor({
      id: 'event-1',
      title: 'Team sync',
      kind: EndeavorKind.calendarEvent,
      start: FIND_REFERENCE_NOW,
    })
    const attempted = endeavorAfterOperation(
      event,
      request(EndeavorOperation.defer, { deferTarget: FIND_REFERENCE_NOW }),
    )
    // The domain returns the very same object when the matrix refuses.
    expect(attempted).toBe(event)
  })

  it('leaves the row untouched for an operation someone else owns', () => {
    expect(
      endeavorAfterOperation(task, request(EndeavorOperation.startSession)),
    ).toBe(task)
  })

  it('leaves the row untouched for a delete — the row is removed, not rewritten', () => {
    expect(
      endeavorAfterOperation(task, request(EndeavorOperation.delete)),
    ).toBe(task)
    expect(findOperationBinding(EndeavorOperation.delete).effect).toBe(
      OperationEffect.softDelete,
    )
  })
})
