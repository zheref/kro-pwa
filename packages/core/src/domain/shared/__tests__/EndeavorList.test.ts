import { describe, expect, it } from 'vitest'
import { endeavorListMocks } from '../__mocks__/EndeavorList.mocks'
import {
  endeavorListsEqual,
  makeProject,
  makeRemindersList,
} from '../EndeavorList'

describe('makeProject / makeRemindersList', () => {
  it('discriminates the two members on `source`', () => {
    expect(makeProject({ id: 'p', title: 'P' }).source).toBe('project')
    expect(makeRemindersList({ id: 'r', title: 'R' }).source).toBe('reminders')
  })

  it('defaults colour to null and inActivity to false, as canon does', () => {
    const project = makeProject({ id: 'p', title: 'P' })
    expect(project.color).toBeNull()
    expect(project.inActivity).toBe(false)
  })

  it('keeps the hex colour verbatim — it is canon’s wire form', () => {
    expect(makeProject({ id: 'p', title: 'P', color: '#4C6EF5' }).color).toBe(
      '#4C6EF5',
    )
  })
})

describe('endeavorListsEqual', () => {
  it('is true for the same id and title', () => {
    expect(
      endeavorListsEqual(endeavorListMocks.finances, {
        ...endeavorListMocks.finances,
      }),
    ).toBe(true)
  })

  it('ignores colour and inActivity, exactly as canon’s == does', () => {
    expect(
      endeavorListsEqual(endeavorListMocks.finances, {
        ...endeavorListMocks.finances,
        color: '#000000',
        inActivity: true,
      }),
    ).toBe(true)
  })

  it('is false when the id differs', () => {
    expect(
      endeavorListsEqual(
        endeavorListMocks.finances,
        endeavorListMocks.household,
      ),
    ).toBe(false)
  })

  it('is false when only the title differs', () => {
    expect(
      endeavorListsEqual(endeavorListMocks.finances, {
        ...endeavorListMocks.finances,
        title: 'Money',
      }),
    ).toBe(false)
  })

  it('does not care which member of the union each side is', () => {
    expect(
      endeavorListsEqual(
        makeProject({ id: 'same', title: 'Same' }),
        makeRemindersList({ id: 'same', title: 'Same' }),
      ),
    ).toBe(true)
  })
})
