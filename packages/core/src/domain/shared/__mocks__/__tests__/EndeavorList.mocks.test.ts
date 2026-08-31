import { describe, expect, it } from 'vitest'
import { allEndeavorListMocks, endeavorListMocks } from '../EndeavorList.mocks'

describe('the AnyEndeavorList mock spread', () => {
  it('offers at least the seven RC-13 variants', () => {
    expect(allEndeavorListMocks.length).toBeGreaterThanOrEqual(7)
  })

  it('gives every fixture a distinct id', () => {
    const ids = allEndeavorListMocks.map((list) => list.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers both members of the union', () => {
    expect(new Set(allEndeavorListMocks.map((list) => list.source))).toEqual(
      new Set(['project', 'reminders']),
    )
  })

  it('includes an uncoloured list and one whose colour is not a hex', () => {
    expect(endeavorListMocks.uncolored.color).toBeNull()
    expect(endeavorListMocks.malformedColor.color).toBe('not-a-hex-colour')
  })

  it('includes an empty title and an in-flight list', () => {
    expect(endeavorListMocks.untitled.title).toBe('')
    expect(endeavorListMocks.syncing.inActivity).toBe(true)
  })
})
