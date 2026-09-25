import { describe, expect, it } from 'vitest'
import {
  dayProgressStateMocks,
  makeDayProgressEndeavors,
} from '../DayProgressMocks'

describe('dayProgressStateMocks', () => {
  it('ships at least seven variants', () => {
    expect(Object.keys(dayProgressStateMocks).length).toBeGreaterThanOrEqual(7)
  })

  it('every opened variant has a selected day no later than today', () => {
    for (const state of Object.values(dayProgressStateMocks)) {
      if (state.today === null || state.selectedDay === null) continue
      expect(state.selectedDay.getTime()).toBeLessThanOrEqual(
        state.today.getTime(),
      )
    }
  })

  it('the non-ASCII variant carries non-ASCII titles', () => {
    const { load } = dayProgressStateMocks.nonAscii
    if (load.kind !== 'loaded') throw new Error('expected loaded')
    expect(
      load.endeavors.some((e) =>
        [...e.title].some((c) => (c.codePointAt(0) ?? 0) > 127),
      ),
    ).toBe(true)
    expect(makeDayProgressEndeavors(new Date()).length).toBeGreaterThanOrEqual(
      7,
    )
  })
})
