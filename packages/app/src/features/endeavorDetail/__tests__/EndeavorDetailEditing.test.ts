/**
 * Acceptance criterion 3 — *"Edit refuses kind-irrelevant fields identically to
 * the domain matrix (no UI-side divergence possible)."*
 *
 * Two kinds of case here, and the split is deliberate:
 *
 * 1. **One truth table**, written out per kind as literal expectations. It is
 *    the only place canon's matrix is restated, so a change to
 *    `EndeavorFieldRelevance` in `@kro/core` breaks **exactly this test** and
 *    nothing else — which is what makes it a canon regression alarm rather than
 *    noise.
 * 2. **Everything else derives** from `isFieldEditable`, so no other assertion
 *    can drift from the domain. The expressibility cases prove the stronger
 *    half: a forbidden change is not merely rejected, it produces the identical
 *    object — there is nothing for a UI to persist.
 */
import type { EndeavorKind } from '@kro/core'
import {
  EndeavorField,
  EndeavorKind as Kind,
  EndeavorStatus,
  EndeavorTag,
  endeavorFields,
  endeavorKinds,
  isFieldEditable,
  makeProject,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  EndeavorDetailSection,
  applyFieldChange,
  editableFieldsBySection,
  editableFieldsFor,
  editableSections,
  endeavorDetailSections,
  endeavorsEqual,
  fieldOfChange,
  fieldsOfSection,
  isChangeExpressible,
  sectionTitle,
} from '../EndeavorDetailEditing'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'

/**
 * Canon's table, per kind — the ONLY restatement of the matrix in this repo's
 * app tier. Every other assertion below derives from `isFieldEditable`.
 */
const CANON_EDITABLE_FIELDS: Record<EndeavorKind, readonly string[]> = {
  // No `start`, no `duration`, no `sessionPoints`: the three meta kinds are not
  // pinned to a time block and earn no session points.
  background: [
    'title',
    'status',
    'due',
    'value',
    'effort',
    'expiry',
    'tags',
    'associatedColor',
    'project',
    'repeatConfig',
  ],
  behavior: [
    'title',
    'status',
    'due',
    'value',
    'effort',
    'expiry',
    'tags',
    'associatedColor',
    'project',
    'repeatConfig',
  ],
  blueprint: [
    'title',
    'status',
    'due',
    'value',
    'effort',
    'expiry',
    'tags',
    'associatedColor',
    'project',
    'repeatConfig',
  ],
  // A calendar event is driven by start/duration and has no `due` at all, and
  // no session points.
  calendarEvent: [
    'title',
    'status',
    'start',
    'duration',
    'value',
    'effort',
    'expiry',
    'tags',
    'associatedColor',
    'project',
    'repeatConfig',
  ],
  // A habit always applies "today", so it has no `due` either — but it is
  // session-trackable.
  habit: [
    'title',
    'status',
    'start',
    'duration',
    'sessionPoints',
    'value',
    'effort',
    'expiry',
    'tags',
    'associatedColor',
    'project',
    'repeatConfig',
  ],
  reminder: [
    'title',
    'status',
    'due',
    'start',
    'duration',
    'sessionPoints',
    'value',
    'effort',
    'expiry',
    'tags',
    'associatedColor',
    'project',
    'repeatConfig',
  ],
  task: [
    'title',
    'status',
    'due',
    'start',
    'duration',
    'sessionPoints',
    'value',
    'effort',
    'expiry',
    'tags',
    'associatedColor',
    'project',
    'repeatConfig',
  ],
}

describe('the kind × field editability truth table matches canon', () => {
  for (const kind of endeavorKinds) {
    it(`offers exactly canon's editable field set for a ${kind}`, () => {
      expect(editableFieldsFor(kind)).toEqual(CANON_EDITABLE_FIELDS[kind])
    })
  }

  it('never offers a field the domain matrix refuses, for any kind', () => {
    for (const kind of endeavorKinds) {
      for (const field of editableFieldsFor(kind)) {
        expect(isFieldEditable(field, kind)).toBe(true)
      }
    }
  })

  it('never omits a field the domain matrix allows, for any kind', () => {
    for (const kind of endeavorKinds) {
      const offered = new Set(editableFieldsFor(kind))
      for (const field of endeavorFields) {
        if (isFieldEditable(field, kind)) expect(offered.has(field)).toBe(true)
      }
    }
  })
})

describe('a forbidden edit cannot be EXPRESSED, not merely rejected', () => {
  const event = detailEndeavorMocks.event
  const habit = detailEndeavorMocks.habit
  const blueprint = detailEndeavorMocks.blueprint

  it('returns the identical object when a calendar event is given a due date', () => {
    const attempted = applyFieldChange(event, {
      field: 'due',
      value: new Date(2026, 5, 20, 9, 0, 0),
    })
    expect(attempted).toBe(event)
  })

  it('returns the identical object when a habit is given a due date', () => {
    expect(applyFieldChange(habit, { field: 'due', value: new Date() })).toBe(
      habit,
    )
  })

  it('returns the identical object when a blueprint is given a duration', () => {
    expect(
      applyFieldChange(blueprint, { field: 'duration', value: 1800 }),
    ).toBe(blueprint)
  })

  it('refuses session points on a calendar event', () => {
    expect(applyFieldChange(event, { field: 'sessionPoints', value: 5 })).toBe(
      event,
    )
  })

  it('refuses the whole duration profile on a blueprint', () => {
    expect(
      applyFieldChange(blueprint, {
        field: 'durationProfile',
        preferred: 1500,
        minimum: 600,
        maximum: 3600,
      }),
    ).toBe(blueprint)
  })

  it('answers the same question ahead of time, so a control can be disabled', () => {
    expect(isChangeExpressible({ field: 'due', value: null }, Kind.habit)).toBe(
      false,
    )
    expect(isChangeExpressible({ field: 'due', value: null }, Kind.task)).toBe(
      true,
    )
  })
})

describe('an allowed edit lands on the working copy', () => {
  const task = detailEndeavorMocks.task

  it('renames a task', () => {
    expect(
      applyFieldChange(task, { field: 'title', value: 'Prepare the deck' })
        .title,
    ).toBe('Prepare the deck')
  })

  it('moves a task’s status', () => {
    expect(
      applyFieldChange(task, { field: 'status', value: EndeavorStatus.blocked })
        .status,
    ).toBe(EndeavorStatus.blocked)
  })

  it('writes the three duration bounds together', () => {
    const updated = applyFieldChange(task, {
      field: 'durationProfile',
      preferred: 1500,
      minimum: 600,
      maximum: 3600,
    })
    expect(updated.duration).toBe(1500)
    expect(updated.minimumDuration).toBe(600)
    expect(updated.maximumDuration).toBe(3600)
  })

  it('adds a tag, then removes it — normalising the empty result back to null', () => {
    const tagged = applyFieldChange(task, {
      field: 'tagToggled',
      value: EndeavorTag.session,
    })
    expect(tagged.tags).toEqual([EndeavorTag.session])
    const untagged = applyFieldChange(tagged, {
      field: 'tagToggled',
      value: EndeavorTag.session,
    })
    // `[]` would rewrite the server's NULL column to '{}' — canon normalises.
    expect(untagged.tags).toBeNull()
  })

  it('moves `list` and `projectId` together, as one user-facing assignment', () => {
    const project = makeProject({ id: 'p-1', title: 'Launch' })
    const assigned = applyFieldChange(task, {
      field: 'project',
      value: project,
    })
    expect(assigned.projectId).toBe('p-1')
    expect(assigned.list?.id).toBe('p-1')

    const cleared = applyFieldChange(assigned, {
      field: 'project',
      value: null,
    })
    expect(cleared.projectId).toBeNull()
    expect(cleared.list).toBeNull()
  })

  it('clears an optional enrichment field', () => {
    expect(
      applyFieldChange(task, { field: 'value', value: null }).value,
    ).toBeNull()
  })
})

describe('endeavorsEqual compares by value, as canon’s struct equality does', () => {
  const task = detailEndeavorMocks.task

  it('treats a structurally identical copy as equal', () => {
    expect(endeavorsEqual(task, { ...task })).toBe(true)
  })

  it('sees through a Date rebuilt from the same instant', () => {
    const rebuilt = {
      ...task,
      due: task.due === null ? null : new Date(task.due.getTime()),
    }
    expect(endeavorsEqual(task, rebuilt)).toBe(true)
  })

  it('reports a real edit as different', () => {
    expect(
      endeavorsEqual(
        task,
        applyFieldChange(task, { field: 'title', value: 'x' }),
      ),
    ).toBe(false)
  })

  it('reports a changed relation array as different', () => {
    expect(endeavorsEqual(task, detailEndeavorMocks.taskWithSessions)).toBe(
      false,
    )
  })
})

describe('fieldOfChange keeps one vocabulary for the question and the change', () => {
  it('maps the duration profile onto the `duration` matrix field', () => {
    expect(
      fieldOfChange({
        field: 'durationProfile',
        preferred: null,
        minimum: null,
        maximum: null,
      }),
    ).toBe(EndeavorField.duration)
  })

  it('maps a tag toggle onto the `tags` matrix field', () => {
    expect(
      fieldOfChange({ field: 'tagToggled', value: EndeavorTag.session }),
    ).toBe(EndeavorField.tags)
  })

  it('maps every other change onto its own field', () => {
    expect(fieldOfChange({ field: 'title', value: 'x' })).toBe(
      EndeavorField.title,
    )
    expect(fieldOfChange({ field: 'expiry', value: null })).toBe(
      EndeavorField.expiry,
    )
  })
})

describe('sections group the editable fields for rendering', () => {
  it('keeps canon’s three sections in display order', () => {
    expect(endeavorDetailSections).toEqual([
      EndeavorDetailSection.core,
      EndeavorDetailSection.enrichment,
      EndeavorDetailSection.recurrence,
    ])
    expect(sectionTitle(EndeavorDetailSection.enrichment)).toBe('Enrichment')
  })

  it('lists every section, empty ones included, so a caller can index them', () => {
    const models = editableFieldsBySection(Kind.blueprint)
    expect(models).toHaveLength(3)
    expect(models.map((model) => model.section)).toEqual(endeavorDetailSections)
  })

  it('omits an empty section from the ones worth a header', () => {
    const sections = editableSections(Kind.task).map((model) => model.section)
    expect(sections).toEqual(endeavorDetailSections)
  })

  it('drops a matrix-refused field out of its section', () => {
    const core = editableFieldsBySection(Kind.calendarEvent).find(
      (model) => model.section === EndeavorDetailSection.core,
    )
    expect(core?.fields).not.toContain(EndeavorField.due)
    expect(core?.fields).toContain(EndeavorField.start)
  })

  it('narrows to a single row when Edit was opened from one Detail field', () => {
    const sections = editableSections(Kind.task, EndeavorField.title)
    expect(sections).toHaveLength(1)
    expect(sections[0]?.fields).toEqual([EndeavorField.title])
  })

  it('keeps every field of a section in canon’s declared display order', () => {
    expect(fieldsOfSection(EndeavorDetailSection.core)).toEqual([
      EndeavorField.title,
      EndeavorField.status,
      EndeavorField.due,
      EndeavorField.start,
      EndeavorField.duration,
      EndeavorField.sessionPoints,
    ])
  })
})
