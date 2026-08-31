/**
 * The kind-relevance matrix, rule by rule. Issue #7 acceptance criterion 2
 * ("`withX` helpers refuse kind-irrelevant edits") rests on this table being
 * right, so it is asserted as a table rather than case by case: every one of
 * the 7 kinds × 13 fields and 7 kinds × 4 relations is pinned.
 */
import { describe, expect, it } from 'vitest'
import { EndeavorKind, endeavorKinds } from '../EndeavorKind'
import {
  EndeavorField,
  EndeavorRelation,
  endeavorFields,
  endeavorRelations,
  isFieldEditable,
  isFieldVisible,
  isKindEditable,
  isRelationEditable,
  isRelationVisible,
} from '../EndeavorFieldRelevance'

/** The kinds a rule names, in canon order, for readable expectations. */
const kindsWhere = (predicate: (kind: EndeavorKind) => boolean) =>
  endeavorKinds.filter(predicate)

describe('the field and relation sets', () => {
  it('enumerates canon’s thirteen fields in declaration order', () => {
    expect(endeavorFields).toEqual([
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
    ])
  })

  it('enumerates canon’s four relations in declaration order', () => {
    expect(endeavorRelations).toEqual([
      'performances',
      'defers',
      'hosts',
      'shadows',
    ])
  })

  it('keeps `project` as ONE field covering both projectId and list', () => {
    expect(endeavorFields).toContain(EndeavorField.project)
    expect(endeavorFields).not.toContain('projectId')
    expect(endeavorFields).not.toContain('list')
  })
})

describe('kind is never editable', () => {
  it('is a hard false, not a per-kind question', () => {
    expect(isKindEditable).toBe(false)
  })
})

describe('rule: `due` is irrelevant to habits and calendar events', () => {
  it('is visible for the other five kinds', () => {
    expect(kindsWhere((kind) => isFieldVisible(EndeavorField.due, kind))).toEqual([
      EndeavorKind.background,
      EndeavorKind.behavior,
      EndeavorKind.blueprint,
      EndeavorKind.reminder,
      EndeavorKind.task,
    ])
  })

  it('is hidden for a habit, which always applies "today"', () => {
    expect(isFieldVisible(EndeavorField.due, EndeavorKind.habit)).toBe(false)
  })

  it('is hidden for a calendar event, which is driven by start + duration', () => {
    expect(isFieldVisible(EndeavorField.due, EndeavorKind.calendarEvent)).toBe(false)
  })
})

describe('rule: `start` and `duration` belong to the time-boxed kinds', () => {
  it('are visible for task, reminder, habit and calendarEvent', () => {
    for (const field of [EndeavorField.start, EndeavorField.duration]) {
      expect(kindsWhere((kind) => isFieldVisible(field, kind))).toEqual([
        EndeavorKind.calendarEvent,
        EndeavorKind.habit,
        EndeavorKind.reminder,
        EndeavorKind.task,
      ])
    }
  })

  it('are hidden for the three meta kinds', () => {
    for (const kind of [
      EndeavorKind.background,
      EndeavorKind.behavior,
      EndeavorKind.blueprint,
    ]) {
      expect(isFieldVisible(EndeavorField.start, kind)).toBe(false)
      expect(isFieldVisible(EndeavorField.duration, kind)).toBe(false)
    }
  })

  it('answer identically for both fields, across every kind', () => {
    for (const kind of endeavorKinds) {
      expect(isFieldVisible(EndeavorField.start, kind)).toBe(
        isFieldVisible(EndeavorField.duration, kind),
      )
    }
  })
})

describe('rule: `sessionPoints` belongs to the session-trackable kinds', () => {
  it('is visible for task, reminder and habit only', () => {
    expect(
      kindsWhere((kind) => isFieldVisible(EndeavorField.sessionPoints, kind)),
    ).toEqual([EndeavorKind.habit, EndeavorKind.reminder, EndeavorKind.task])
  })

  it('is hidden for a calendar event, which cannot be a focus session', () => {
    expect(
      isFieldVisible(EndeavorField.sessionPoints, EndeavorKind.calendarEvent),
    ).toBe(false)
  })

  it('is hidden for all three meta kinds', () => {
    expect(
      isFieldVisible(EndeavorField.sessionPoints, EndeavorKind.blueprint),
    ).toBe(false)
    expect(
      isFieldVisible(EndeavorField.sessionPoints, EndeavorKind.behavior),
    ).toBe(false)
    expect(
      isFieldVisible(EndeavorField.sessionPoints, EndeavorKind.background),
    ).toBe(false)
  })
})

describe('rule: the remaining nine fields apply to every kind', () => {
  const uniform: readonly EndeavorField[] = [
    EndeavorField.title,
    EndeavorField.status,
    EndeavorField.value,
    EndeavorField.effort,
    EndeavorField.expiry,
    EndeavorField.tags,
    EndeavorField.associatedColor,
    EndeavorField.project,
    EndeavorField.repeatConfig,
  ]

  it('are visible for all seven kinds', () => {
    for (const field of uniform) {
      expect(kindsWhere((kind) => isFieldVisible(field, kind))).toEqual(endeavorKinds)
    }
  })

  it('include the three Kro-enhanced overlay fields', () => {
    for (const field of [
      EndeavorField.value,
      EndeavorField.effort,
      EndeavorField.expiry,
    ]) {
      expect(uniform).toContain(field)
    }
  })

  it('cover every field the three kind-specific rules do not', () => {
    expect(
      endeavorFields.filter((field) => !uniform.includes(field)),
    ).toEqual([
      EndeavorField.due,
      EndeavorField.start,
      EndeavorField.duration,
      EndeavorField.sessionPoints,
    ])
  })
})

describe('rule: editability mirrors visibility for non-relation fields', () => {
  it('agrees on every kind × field pair — v1 has no visible-but-locked field', () => {
    for (const kind of endeavorKinds) {
      for (const field of endeavorFields) {
        expect(isFieldEditable(field, kind)).toBe(isFieldVisible(field, kind))
      }
    }
  })

  it('still refuses a habit’s due date', () => {
    expect(isFieldEditable(EndeavorField.due, EndeavorKind.habit)).toBe(false)
  })

  it('still refuses a blueprint’s duration', () => {
    expect(isFieldEditable(EndeavorField.duration, EndeavorKind.blueprint)).toBe(
      false,
    )
  })
})

describe('rule: relations are always visible', () => {
  it('holds for every relation × kind pair', () => {
    for (const kind of endeavorKinds) {
      for (const relation of endeavorRelations) {
        expect(isRelationVisible(relation, kind)).toBe(true)
      }
    }
  })

  it('is visible even where it is not editable — the two differ', () => {
    expect(isRelationVisible(EndeavorRelation.defers, EndeavorKind.habit)).toBe(true)
    expect(isRelationEditable(EndeavorRelation.defers, EndeavorKind.habit)).toBe(
      false,
    )
  })

  it('is visible for the relation with the narrowest editable set', () => {
    expect(
      isRelationVisible(EndeavorRelation.performances, EndeavorKind.blueprint),
    ).toBe(true)
  })
})

describe('rule: `defers` tracks `due` exactly', () => {
  it('is editable for the same five kinds `due` is', () => {
    expect(
      kindsWhere((kind) => isRelationEditable(EndeavorRelation.defers, kind)),
    ).toEqual(kindsWhere((kind) => isFieldEditable(EndeavorField.due, kind)))
  })

  it('refuses a calendar event — the acceptance criterion’s worked example', () => {
    expect(
      isRelationEditable(EndeavorRelation.defers, EndeavorKind.calendarEvent),
    ).toBe(false)
  })

  it('refuses a habit for the same reason `due` is hidden on one', () => {
    expect(isRelationEditable(EndeavorRelation.defers, EndeavorKind.habit)).toBe(
      false,
    )
  })
})

describe('rule: `performances` belongs to the session-trackable kinds', () => {
  it('is editable for task, reminder and habit only', () => {
    expect(
      kindsWhere((kind) => isRelationEditable(EndeavorRelation.performances, kind)),
    ).toEqual([EndeavorKind.habit, EndeavorKind.reminder, EndeavorKind.task])
  })

  it('matches `sessionPoints`’ own kind set exactly', () => {
    expect(
      kindsWhere((kind) => isRelationEditable(EndeavorRelation.performances, kind)),
    ).toEqual(kindsWhere((kind) => isFieldEditable(EndeavorField.sessionPoints, kind)))
  })

  it('refuses a calendar event', () => {
    expect(
      isRelationEditable(EndeavorRelation.performances, EndeavorKind.calendarEvent),
    ).toBe(false)
  })
})

describe('rule: `hosts` and `shadows` track each other', () => {
  it('are editable for task, reminder and calendarEvent', () => {
    for (const relation of [EndeavorRelation.hosts, EndeavorRelation.shadows]) {
      expect(kindsWhere((kind) => isRelationEditable(relation, kind))).toEqual([
        EndeavorKind.calendarEvent,
        EndeavorKind.reminder,
        EndeavorKind.task,
      ])
    }
  })

  it('answer identically for every kind — a shadow tracks its host', () => {
    for (const kind of endeavorKinds) {
      expect(isRelationEditable(EndeavorRelation.hosts, kind)).toBe(
        isRelationEditable(EndeavorRelation.shadows, kind),
      )
    }
  })

  it('refuse a habit, which has no external write-back target', () => {
    expect(isRelationEditable(EndeavorRelation.hosts, EndeavorKind.habit)).toBe(false)
    expect(isRelationEditable(EndeavorRelation.shadows, EndeavorKind.habit)).toBe(
      false,
    )
  })

  it('differ from `performances`, which habits DO have and events do not', () => {
    expect(
      isRelationEditable(EndeavorRelation.performances, EndeavorKind.habit),
    ).toBe(true)
    expect(isRelationEditable(EndeavorRelation.hosts, EndeavorKind.habit)).toBe(false)
  })
})

describe('the meta kinds edit `defers` and nothing else', () => {
  const metaKinds = [
    EndeavorKind.background,
    EndeavorKind.behavior,
    EndeavorKind.blueprint,
  ]

  it('allows `defers`, because `due` is relevant to them', () => {
    // Easy to misread: a background item is not time-boxed, but it still has
    // a due date, so deferring it is meaningful.
    for (const kind of metaKinds) {
      expect(isFieldEditable(EndeavorField.due, kind)).toBe(true)
      expect(isRelationEditable(EndeavorRelation.defers, kind)).toBe(true)
    }
  })

  it('refuses performances, hosts and shadows for all three', () => {
    for (const kind of metaKinds) {
      for (const relation of [
        EndeavorRelation.performances,
        EndeavorRelation.hosts,
        EndeavorRelation.shadows,
      ]) {
        expect(isRelationEditable(relation, kind)).toBe(false)
      }
    }
  })

  it('leaves exactly one editable relation each', () => {
    for (const kind of metaKinds) {
      expect(
        endeavorRelations.filter((relation) => isRelationEditable(relation, kind)),
      ).toEqual([EndeavorRelation.defers])
    }
  })
})
