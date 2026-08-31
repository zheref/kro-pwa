import { describe, expect, it } from 'vitest'
import {
  EisenhowerQuadrant,
  defaultTriageDurationOptionsMinutes,
  eisenhowerQuadrants,
  quadrantCaption,
  quadrantDisplayName,
  quadrantIcon,
  quadrantImportantSibling,
  quadrantIsImportant,
  quadrantIsUrgent,
  quadrantKeepsEndeavor,
} from '../EisenhowerQuadrant'

describe('EisenhowerQuadrant canon parity', () => {
  it('has canon’s four cases in declaration order', () => {
    expect(eisenhowerQuadrants).toEqual([
      'prioritize',
      'decide',
      'delegate',
      'delete',
    ])
  })

  it('offers canon’s triage duration chips', () => {
    expect(defaultTriageDurationOptionsMinutes).toEqual([
      1, 5, 15, 25, 45, 60, 90, 120, 180,
    ])
  })
})

describe('quadrantDisplayName', () => {
  it('renders `decide` as "Schedule", not "Decide"', () => {
    expect(quadrantDisplayName(EisenhowerQuadrant.decide)).toBe('Schedule')
  })

  it('renders `delete` as "Archive", not "Delete"', () => {
    expect(quadrantDisplayName(EisenhowerQuadrant.delete)).toBe('Archive')
  })

  it('renders the two whose label matches the case name', () => {
    expect(quadrantDisplayName(EisenhowerQuadrant.prioritize)).toBe('Prioritize')
    expect(quadrantDisplayName(EisenhowerQuadrant.delegate)).toBe('Delegate')
  })
})

describe('quadrantIsImportant / quadrantIsUrgent', () => {
  it('puts prioritize and decide in the Important row', () => {
    expect(eisenhowerQuadrants.filter(quadrantIsImportant)).toEqual([
      EisenhowerQuadrant.prioritize,
      EisenhowerQuadrant.decide,
    ])
  })

  it('puts prioritize and delegate in the Urgent column', () => {
    expect(eisenhowerQuadrants.filter(quadrantIsUrgent)).toEqual([
      EisenhowerQuadrant.prioritize,
      EisenhowerQuadrant.delegate,
    ])
  })

  it('makes prioritize the only both, and delete the only neither', () => {
    expect(
      eisenhowerQuadrants.filter(
        (quadrant) => quadrantIsImportant(quadrant) && quadrantIsUrgent(quadrant),
      ),
    ).toEqual([EisenhowerQuadrant.prioritize])
    expect(
      eisenhowerQuadrants.filter(
        (quadrant) =>
          !quadrantIsImportant(quadrant) && !quadrantIsUrgent(quadrant),
      ),
    ).toEqual([EisenhowerQuadrant.delete])
  })
})

describe('quadrantImportantSibling', () => {
  it('leaves an already-important quadrant alone', () => {
    expect(quadrantImportantSibling(EisenhowerQuadrant.prioritize)).toBe(
      EisenhowerQuadrant.prioritize,
    )
    expect(quadrantImportantSibling(EisenhowerQuadrant.decide)).toBe(
      EisenhowerQuadrant.decide,
    )
  })

  it('promotes delegate to prioritize — urgent stays urgent', () => {
    expect(quadrantImportantSibling(EisenhowerQuadrant.delegate)).toBe(
      EisenhowerQuadrant.prioritize,
    )
  })

  it('promotes delete to decide — not-urgent stays not-urgent', () => {
    expect(quadrantImportantSibling(EisenhowerQuadrant.delete)).toBe(
      EisenhowerQuadrant.decide,
    )
  })

  it('preserves the urgency axis for every case', () => {
    for (const quadrant of eisenhowerQuadrants) {
      expect(quadrantIsUrgent(quadrantImportantSibling(quadrant))).toBe(
        quadrantIsUrgent(quadrant),
      )
    }
  })

  it('always lands in the Important row', () => {
    for (const quadrant of eisenhowerQuadrants) {
      expect(quadrantIsImportant(quadrantImportantSibling(quadrant))).toBe(true)
    }
  })
})

describe('quadrantCaption', () => {
  it('spells out both axes for the three that keep the endeavor', () => {
    expect(quadrantCaption(EisenhowerQuadrant.prioritize)).toBe('Urgent · Important')
    expect(quadrantCaption(EisenhowerQuadrant.decide)).toBe('Important · Not Urgent')
    expect(quadrantCaption(EisenhowerQuadrant.delegate)).toBe('Urgent · Not Important')
  })

  it('says only "Neither" for delete', () => {
    expect(quadrantCaption(EisenhowerQuadrant.delete)).toBe('Neither')
  })

  it('gives every quadrant a non-empty caption', () => {
    for (const quadrant of eisenhowerQuadrants) {
      expect(quadrantCaption(quadrant).length).toBeGreaterThan(0)
    }
  })
})

describe('quadrantIcon', () => {
  it('maps every quadrant to its canon SF Symbol', () => {
    expect(eisenhowerQuadrants.map(quadrantIcon)).toEqual([
      { type: 'glyph', name: 'bolt.fill' },
      { type: 'glyph', name: 'calendar' },
      { type: 'glyph', name: 'person.2.fill' },
      { type: 'glyph', name: 'trash' },
    ])
  })

  it('gives each quadrant a distinct glyph', () => {
    const names = eisenhowerQuadrants.map((quadrant) => {
      const icon = quadrantIcon(quadrant)
      return icon.type === 'glyph' ? icon.name : icon.value
    })
    expect(new Set(names).size).toBe(names.length)
  })

  it('never returns an emoji case — canon supplies glyph names only', () => {
    for (const quadrant of eisenhowerQuadrants) {
      expect(quadrantIcon(quadrant).type).toBe('glyph')
    }
  })
})

describe('quadrantKeepsEndeavor', () => {
  it('keeps the endeavor for the three non-archive quadrants', () => {
    expect(quadrantKeepsEndeavor(EisenhowerQuadrant.prioritize)).toBe(true)
    expect(quadrantKeepsEndeavor(EisenhowerQuadrant.decide)).toBe(true)
    expect(quadrantKeepsEndeavor(EisenhowerQuadrant.delegate)).toBe(true)
  })

  it('drops it for delete', () => {
    expect(quadrantKeepsEndeavor(EisenhowerQuadrant.delete)).toBe(false)
  })

  it('is false for exactly one of the four', () => {
    expect(eisenhowerQuadrants.filter((q) => !quadrantKeepsEndeavor(q))).toEqual([
      EisenhowerQuadrant.delete,
    ])
  })
})
