import { describe, expect, it } from 'vitest'
import {
  EndeavorKind,
  endeavorKindDisplayName,
  endeavorKindFromRawValue,
  endeavorKinds,
} from '../EndeavorKind'

describe('EndeavorKind canon parity', () => {
  it('has exactly canon’s seven kinds, in declaration order', () => {
    expect(endeavorKinds).toEqual([
      'background',
      'behavior',
      'blueprint',
      'calendarEvent',
      'habit',
      'reminder',
      'task',
    ])
  })

  it('uses the case name as the raw value, so `calendarEvent` stays camelCase', () => {
    expect(EndeavorKind.calendarEvent).toBe('calendarEvent')
  })

  it('lists every declared member exactly once', () => {
    expect(new Set(endeavorKinds).size).toBe(endeavorKinds.length)
    expect(endeavorKinds.length).toBe(Object.keys(EndeavorKind).length)
  })
})

describe('endeavorKindFromRawValue', () => {
  it('narrows a known raw value', () => {
    expect(endeavorKindFromRawValue('habit')).toBe(EndeavorKind.habit)
  })

  it('returns null for an unknown one', () => {
    expect(endeavorKindFromRawValue('project')).toBeNull()
  })

  it('round-trips every kind', () => {
    for (const kind of endeavorKinds) {
      expect(endeavorKindFromRawValue(kind)).toBe(kind)
    }
  })
})

describe('endeavorKindDisplayName', () => {
  it('splits `calendarEvent` into two words', () => {
    expect(endeavorKindDisplayName(EndeavorKind.calendarEvent)).toBe('Calendar Event')
  })

  it('title-cases the single-word kinds', () => {
    expect(endeavorKindDisplayName(EndeavorKind.background)).toBe('Background')
    expect(endeavorKindDisplayName(EndeavorKind.task)).toBe('Task')
  })

  it('names all seven, each distinctly', () => {
    const names = endeavorKinds.map(endeavorKindDisplayName)
    expect(names).toEqual([
      'Background',
      'Behavior',
      'Blueprint',
      'Calendar Event',
      'Habit',
      'Reminder',
      'Task',
    ])
    expect(new Set(names).size).toBe(names.length)
  })
})
