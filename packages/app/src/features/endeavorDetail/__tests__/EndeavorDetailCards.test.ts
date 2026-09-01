/**
 * The Detail read surface's grouped cards and its header derivations.
 *
 * Detail asks the matrix's **visibility** question where Edit asks its
 * **editability** one; the two happen to agree in v1, and the cases below assert
 * that Detail is asking its own question rather than borrowing Edit's answer.
 */
import {
  EndeavorField,
  EndeavorKind,
  EndeavorRelation,
  endeavorRelations,
  isFieldVisible,
  isRelationEditable,
  makeEndeavor,
} from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  detailDisplayTitle,
  detailHeaderBadges,
  relationCards,
  visibleFieldsBySection,
  visibleSections,
} from '../EndeavorDetailCards'
import { EndeavorDetailSection } from '../EndeavorDetailEditing'
import { detailEndeavorMocks } from '../EndeavorDetailMocks'

describe('the grouped cards follow the matrix’s visibility answer', () => {
  it('shows every section for a task', () => {
    expect(
      visibleSections(EndeavorKind.task).map((model) => model.section),
    ).toEqual([
      EndeavorDetailSection.core,
      EndeavorDetailSection.enrichment,
      EndeavorDetailSection.recurrence,
    ])
  })

  it('hides `due` on a calendar event and keeps `start`', () => {
    const core = visibleFieldsBySection(EndeavorKind.calendarEvent).find(
      (model) => model.section === EndeavorDetailSection.core,
    )
    expect(core?.fields).not.toContain(EndeavorField.due)
    expect(core?.fields).toContain(EndeavorField.start)
  })

  it('hides `start` and `duration` on a blueprint', () => {
    const core = visibleFieldsBySection(EndeavorKind.blueprint).find(
      (model) => model.section === EndeavorDetailSection.core,
    )
    expect(core?.fields).not.toContain(EndeavorField.start)
    expect(core?.fields).not.toContain(EndeavorField.duration)
  })

  it('lists every section, empty ones included, so a caller can index them', () => {
    expect(visibleFieldsBySection(EndeavorKind.habit)).toHaveLength(3)
  })

  it('never shows a field the domain says is invisible for the kind', () => {
    for (const model of visibleFieldsBySection(EndeavorKind.habit)) {
      for (const field of model.fields) {
        expect(isFieldVisible(field, EndeavorKind.habit)).toBe(true)
      }
    }
  })
})

describe('the relation cards are always visible, and manageable per kind', () => {
  it('shows all four relations for every kind', () => {
    for (const endeavor of [
      detailEndeavorMocks.task,
      detailEndeavorMocks.event,
      detailEndeavorMocks.blueprint,
    ]) {
      expect(relationCards(endeavor)).toHaveLength(endeavorRelations.length)
      expect(relationCards(endeavor).every((card) => card.isVisible)).toBe(true)
    }
  })

  it('marks performances unmanageable on a calendar event', () => {
    const card = relationCards(detailEndeavorMocks.event).find(
      (candidate) => candidate.relation === EndeavorRelation.performances,
    )
    expect(card?.isManageable).toBe(false)
  })

  it('marks hosts unmanageable on a habit', () => {
    const card = relationCards(detailEndeavorMocks.habit).find(
      (candidate) => candidate.relation === EndeavorRelation.hosts,
    )
    expect(card?.isManageable).toBe(false)
  })

  it('answers manageability from the domain matrix, never a local rule', () => {
    for (const card of relationCards(detailEndeavorMocks.event)) {
      expect(card.isManageable).toBe(
        isRelationEditable(card.relation, detailEndeavorMocks.event.kind),
      )
    }
  })

  it('counts the entries each relation currently holds', () => {
    const cards = relationCards(detailEndeavorMocks.taskWithSessions)
    expect(
      cards.find((card) => card.relation === EndeavorRelation.performances)
        ?.count,
    ).toBe(3)
    expect(
      cards.find((card) => card.relation === EndeavorRelation.defers)?.count,
    ).toBe(0)
  })

  it('counts shadows and hosts on a mirrored endeavor', () => {
    const cards = relationCards(detailEndeavorMocks.event)
    expect(
      cards.find((card) => card.relation === EndeavorRelation.shadows)?.count,
    ).toBe(1)
    expect(
      cards.find((card) => card.relation === EndeavorRelation.hosts)?.count,
    ).toBe(1)
  })
})

describe('the header badges lead with kind, then status, then what is set', () => {
  it('always leads with the kind chip', () => {
    const [first] = detailHeaderBadges(detailEndeavorMocks.task)
    expect(first?.kind).toBe('kind')
  })

  it('always carries the status chip second', () => {
    const badges = detailHeaderBadges(detailEndeavorMocks.task)
    expect(badges[1]?.kind).toBe('status')
  })

  it('adds a duration chip only when a duration is set', () => {
    expect(
      detailHeaderBadges(detailEndeavorMocks.task).some(
        (badge) => badge.kind === 'duration',
      ),
    ).toBe(true)
    expect(
      detailHeaderBadges(detailEndeavorMocks.habit).some(
        (badge) => badge.kind === 'duration',
      ),
    ).toBe(false)
  })

  it('adds a reward chip only for a positive point value', () => {
    const zeroPoints = makeEndeavor({
      id: 'zero',
      title: 'zero',
      kind: EndeavorKind.task,
      sessionPoints: 0,
    })
    expect(
      detailHeaderBadges(zeroPoints).some(
        (badge) => badge.kind === 'rewardPoints',
      ),
    ).toBe(false)
    expect(
      detailHeaderBadges(detailEndeavorMocks.task).some(
        (badge) => badge.kind === 'rewardPoints',
      ),
    ).toBe(true)
  })

  it('adds a repeats chip only for a recurring endeavor', () => {
    expect(
      detailHeaderBadges(detailEndeavorMocks.task).some(
        (badge) => badge.kind === 'repeats',
      ),
    ).toBe(false)
  })

  it('keeps a sparse endeavor’s header to the two mandatory chips', () => {
    expect(detailHeaderBadges(detailEndeavorMocks.blueprint)).toHaveLength(2)
  })
})

describe('the display title never renders blank', () => {
  it('trims a padded title', () => {
    expect(
      detailDisplayTitle({ ...detailEndeavorMocks.task, title: '  Slides  ' }),
    ).toBe('Slides')
  })

  it('falls back to "Untitled" for a whitespace-only title', () => {
    expect(detailDisplayTitle(detailEndeavorMocks.untitled)).toBe('Untitled')
  })

  it('passes a normal title straight through', () => {
    expect(detailDisplayTitle(detailEndeavorMocks.event)).toBe('Team sync')
  })
})
