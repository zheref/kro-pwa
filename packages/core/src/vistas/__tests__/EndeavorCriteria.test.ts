import { describe, expect, it } from 'vitest'
import {
  EndeavorGroupingCriteria,
  EndeavorSortingCriteria,
  ascendingBy,
  descendingBy,
  endeavorGroupingCriteriaCaption,
  endeavorGroupingCriteriaCases,
  endeavorGroupingCriteriaDisplayName,
  endeavorGroupingCriteriaFromRawValue,
  endeavorSortingCriteriaCases,
  endeavorSortingCriteriaDisplayName,
  endeavorSortingCriteriaFromRawValue,
} from '../EndeavorCriteria'

describe('grouping criteria', () => {
  it('carries canon’s four cases, in declaration order', () => {
    expect(endeavorGroupingCriteriaCases).toEqual([
      'status',
      'host',
      'kind',
      'dueSection',
    ])
  })

  it('narrows a persisted grouping choice back into the union', () => {
    expect(endeavorGroupingCriteriaFromRawValue('dueSection')).toBe(
      EndeavorGroupingCriteria.dueSection,
    )
  })

  it('refuses a criterion the app never offered, so a stale save falls back', () => {
    expect(endeavorGroupingCriteriaFromRawValue('project')).toBeNull()
  })

  it('labels `dueSection` as two words for the filter sheet', () => {
    expect(
      endeavorGroupingCriteriaDisplayName(EndeavorGroupingCriteria.dueSection),
    ).toBe('Due Section')
  })

  it('names every criterion, none falling through to a raw value', () => {
    for (const criteria of endeavorGroupingCriteriaCases) {
      expect(
        endeavorGroupingCriteriaDisplayName(criteria).length,
      ).toBeGreaterThan(0)
    }
  })
})

describe('grouping captions', () => {
  it('prefixes a host group with "At " — trailing space included, it is the separator', () => {
    expect(endeavorGroupingCriteriaCaption(EndeavorGroupingCriteria.host)).toBe(
      'At ',
    )
  })

  it('prefixes a kind group with "As "', () => {
    expect(endeavorGroupingCriteriaCaption(EndeavorGroupingCriteria.kind)).toBe(
      'As ',
    )
  })

  it('gives status and due-section groups no preposition at all', () => {
    expect(
      endeavorGroupingCriteriaCaption(EndeavorGroupingCriteria.status),
    ).toBe('')
    expect(
      endeavorGroupingCriteriaCaption(EndeavorGroupingCriteria.dueSection),
    ).toBe('')
  })
})

describe('sorting criteria', () => {
  it('carries canon’s four cases, in declaration order', () => {
    expect(endeavorSortingCriteriaCases).toEqual([
      'due',
      'duration',
      'createdAt',
      'completedOn',
    ])
  })

  it('narrows a raw value back into the union', () => {
    expect(endeavorSortingCriteriaFromRawValue('completedOn')).toBe(
      EndeavorSortingCriteria.completedOn,
    )
  })

  it('refuses an unknown sorting key', () => {
    expect(endeavorSortingCriteriaFromRawValue('title')).toBeNull()
  })

  it('spells `createdAt` as "Date Created" for a human, not as its field name', () => {
    expect(
      endeavorSortingCriteriaDisplayName(EndeavorSortingCriteria.createdAt),
    ).toBe('Date Created')
  })
})

describe('sorting parameters', () => {
  it('builds an ascending parameter carrying its criterion', () => {
    expect(ascendingBy(EndeavorSortingCriteria.due)).toEqual({
      direction: 'ascending',
      criteria: 'due',
    })
  })

  it('builds a descending parameter over the same criterion', () => {
    expect(descendingBy(EndeavorSortingCriteria.due)).toEqual({
      direction: 'descending',
      criteria: 'due',
    })
  })

  it('keeps direction and criterion independent, so both orders exist per criterion', () => {
    for (const criteria of endeavorSortingCriteriaCases) {
      expect(ascendingBy(criteria).criteria).toBe(criteria)
      expect(descendingBy(criteria).criteria).toBe(criteria)
      expect(ascendingBy(criteria).direction).not.toBe(
        descendingBy(criteria).direction,
      )
    }
  })
})
