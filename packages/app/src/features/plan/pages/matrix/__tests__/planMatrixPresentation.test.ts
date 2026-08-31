/**
 * The matrix's display vocabulary.
 *
 * The pair worth pinning is the naming split: the domain says `decide` and
 * `delete`, the surface says **Schedule** and **Archive**, and a round trip
 * through both functions has to land where it started — otherwise a card
 * dropped into Schedule would come back classified as Prioritize.
 */
import { EisenhowerQuadrant, eisenhowerQuadrants } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  PlanMatrixQuadrant,
  eisenhowerQuadrantFor,
  planMatrixActionForeground,
  planMatrixAddExistingLabel,
  planMatrixAddLabel,
  planMatrixAddNewLabel,
  planMatrixItemSymbol,
  planMatrixQuadrantCaption,
  planMatrixQuadrantFor,
  planMatrixQuadrantTint,
  planMatrixQuadrantTitle,
  planMatrixQuadrants,
} from '../planMatrixPresentation'

describe('planMatrixQuadrants', () => {
  it('reads in the board order: Prioritize · Schedule, then Delegate · Archive', () => {
    expect(planMatrixQuadrants.map(planMatrixQuadrantTitle)).toEqual([
      'Prioritize',
      'Schedule',
      'Delegate',
      'Archive',
    ])
  })

  it('carries all four of canon captions, second line for second line', () => {
    expect(planMatrixQuadrants.map(planMatrixQuadrantCaption)).toEqual([
      'Urgent · Important',
      'Important · Later',
      'Urgent · Lower impact',
      'Lower impact · Later',
    ])
  })

  it('covers every Eisenhower quadrant exactly once', () => {
    expect(planMatrixQuadrants.map(eisenhowerQuadrantFor).sort()).toEqual(
      [...eisenhowerQuadrants].sort(),
    )
  })
})

describe('the two-name mapping', () => {
  it('maps Schedule onto the domain "decide", not onto a same-named case', () => {
    expect(eisenhowerQuadrantFor(PlanMatrixQuadrant.schedule)).toBe(
      EisenhowerQuadrant.decide,
    )
  })

  it('maps Archive onto the domain "delete"', () => {
    expect(eisenhowerQuadrantFor(PlanMatrixQuadrant.archive)).toBe(
      EisenhowerQuadrant.delete,
    )
  })

  it('round-trips every quadrant, so a drop lands where the card is drawn', () => {
    for (const quadrant of planMatrixQuadrants) {
      expect(planMatrixQuadrantFor(eisenhowerQuadrantFor(quadrant))).toBe(
        quadrant,
      )
    }
  })

  it('round-trips from the domain side too', () => {
    for (const quadrant of eisenhowerQuadrants) {
      expect(eisenhowerQuadrantFor(planMatrixQuadrantFor(quadrant))).toBe(
        quadrant,
      )
    }
  })
})

describe('planMatrixQuadrantTint', () => {
  it('uses canon four hues as measured badge roles, never the raw system tints', () => {
    expect(planMatrixQuadrants.map(planMatrixQuadrantTint)).toEqual([
      'badgeRed',
      'badgeBlue',
      'badgeOrange',
      'badgeNeutral',
    ])
  })

  it('gives Archive controls the ordinary foreground, as canon does', () => {
    expect(planMatrixActionForeground(PlanMatrixQuadrant.archive)).toBe('fore')
  })

  it('keeps every other quadrant control on its own tint', () => {
    expect(planMatrixActionForeground(PlanMatrixQuadrant.prioritize)).toBe(
      'badgeRed',
    )
  })
})

describe('planMatrixItemSymbol', () => {
  it('shows the leading emoji of the title as the card face', () => {
    expect(planMatrixItemSymbol('🦷 Call the dentist')).toEqual({
      symbol: '🦷',
      isGeneric: false,
    })
  })

  it('falls back to a checkmark, not a calendar — the matrix admits only tasks', () => {
    expect(planMatrixItemSymbol('File the tax return')).toEqual({
      symbol: 'checkmark.circle',
      isGeneric: true,
    })
  })

  it('does not lift an emoji that is not at the front of the title', () => {
    expect(planMatrixItemSymbol('Ship the 🚀 release').isGeneric).toBe(true)
  })
})

describe('the add labels', () => {
  it('names the quadrant the plus button adds to', () => {
    expect(planMatrixAddLabel(PlanMatrixQuadrant.delegate)).toBe(
      'Add to Delegate',
    )
  })

  it('distinguishes the two menu entries for a screen reader', () => {
    expect(planMatrixAddNewLabel(PlanMatrixQuadrant.schedule)).toBe(
      'Add new endeavor to Schedule',
    )
    expect(planMatrixAddExistingLabel(PlanMatrixQuadrant.schedule)).toBe(
      'Add existing endeavor to Schedule',
    )
  })

  it('labels every quadrant, so no add control is announced as bare "Add"', () => {
    for (const quadrant of planMatrixQuadrants) {
      expect(planMatrixAddLabel(quadrant)).toContain(
        planMatrixQuadrantTitle(quadrant),
      )
    }
  })
})
