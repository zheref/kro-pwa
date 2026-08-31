import { describe, expect, it } from 'vitest'
import { WeekDay } from '../../domain/shared/WeekDay'
import {
  makeInMemoryKeyValueStore,
  signOutContractStoreSeed,
} from '../__mocks__/KeyValueStore.mocks'
import {
  makePreferences,
  preferenceBool,
  preferenceDays,
  preferenceInt,
  preferencePick,
  preferenceString,
  preferenceTime,
} from '../Preferences'
import {
  earnPointsFormulaOption,
  hapticsOption,
  sessionDefaultDurationOption,
  timezoneOption,
  workingDaysOption,
  workingHoursStartOption,
} from '../SettingOptions'
import { makeTimeOfDay } from '../TimeOfDay'

describe('reading a preference', () => {
  it('resolves the declared default on a first launch, before anything is written', () => {
    const preferences = makePreferences(makeInMemoryKeyValueStore())
    expect(preferences.read(sessionDefaultDurationOption)).toBe(20)
    expect(preferences.read(workingHoursStartOption)).toBe(540)
    expect(preferences.read(hapticsOption)).toBe(true)
  })

  it('resolves the stored value once the user has changed it', () => {
    const store = makeInMemoryKeyValueStore({
      'kro:session.defaultDuration': 45,
    })
    const preferences = makePreferences(store)
    expect(preferences.read(sessionDefaultDurationOption)).toBe(45)
  })

  it('resolves null for an option canon declares with no default', () => {
    const preferences = makePreferences(makeInMemoryKeyValueStore())
    expect(preferences.read(timezoneOption)).toBeNull()
  })
})

describe('writing a preference', () => {
  it('namespaces the key under kro: so a sign-out can find it later', () => {
    const store = makeInMemoryKeyValueStore()
    makePreferences(store).write(sessionDefaultDurationOption, 45)
    expect(store.get('kro:session.defaultDuration')).toBe(45)
  })

  it('coerces a clock time and a weekday list to their stored primitives', () => {
    const store = makeInMemoryKeyValueStore()
    const preferences = makePreferences(store)
    preferences.write(workingHoursStartOption, makeTimeOfDay(7, 30))
    preferences.write(workingDaysOption, [WeekDay.saturday, WeekDay.sunday])
    expect(store.get('kro:general.workingHoursStart')).toBe(450)
    expect(store.get('kro:general.workingDays')).toBe(96)
  })

  it('refuses a value of the wrong shape and leaves the stored value alone', () => {
    const store = makeInMemoryKeyValueStore({
      'kro:session.defaultDuration': 45,
    })
    const preferences = makePreferences(store)
    const written = preferences.write(
      sessionDefaultDurationOption,
      // @ts-expect-error the type already refuses this; the test pins that the runtime refuses it too, rather than storing a shape a read would discard
      { minutes: 5 },
    )
    expect(written).toBe(false)
    expect(store.get('kro:session.defaultDuration')).toBe(45)
  })
})

describe('the sign-out wipe', () => {
  it('clears every stored preference so the next account starts from defaults', () => {
    const store = makeInMemoryKeyValueStore(signOutContractStoreSeed)
    const preferences = makePreferences(store)
    expect(preferences.read(sessionDefaultDurationOption)).toBe(45)

    preferences.clearAll()

    expect(preferences.read(sessionDefaultDurationOption)).toBe(20)
    expect(preferences.read(hapticsOption)).toBe(true)
  })

  it('spares every debug flag override — a different namespace, deliberately', () => {
    const store = makeInMemoryKeyValueStore(signOutContractStoreSeed)
    makePreferences(store).clearAll()
    expect(new Set(store.keys())).toEqual(
      new Set(['debug.ff.sessionBreak', 'debug.ff.matrix']),
    )
  })

  it('is a no-op on an empty store', () => {
    const store = makeInMemoryKeyValueStore()
    makePreferences(store).clearAll()
    expect(store.keys()).toEqual([])
  })
})

describe('typed reads', () => {
  const store = makeInMemoryKeyValueStore({
    'kro:general.workingHoursStart': 450,
    'kro:general.workingDays': 96,
  })
  const preferences = makePreferences(store)

  it('reads a toggle, a count and a picker raw value in their own types', () => {
    expect(preferenceBool(preferences, hapticsOption)).toBe(true)
    expect(preferenceInt(preferences, sessionDefaultDurationOption)).toBe(20)
    expect(preferencePick(preferences, earnPointsFormulaOption)).toBe(
      'slidingScale',
    )
  })

  it('reads a stored minute count back as a clock time', () => {
    expect(preferenceTime(preferences, workingHoursStartOption)).toEqual({
      hour: 7,
      minute: 30,
    })
  })

  it('reads a stored bitmask back as weekdays in Monday-first order', () => {
    expect(preferenceDays(preferences, workingDaysOption)).toEqual([
      'saturday',
      'sunday',
    ])
  })

  it('falls back the way canon does when an option has no value at all', () => {
    const empty = makePreferences(makeInMemoryKeyValueStore())
    expect(preferenceString(empty, timezoneOption)).toBe('')
    expect(preferenceInt(empty, timezoneOption)).toBe(0)
    expect(preferenceBool(empty, timezoneOption)).toBe(false)
    expect(preferenceTime(empty, timezoneOption)).toEqual({
      hour: 0,
      minute: 0,
    })
    expect(preferenceDays(empty, timezoneOption)).toEqual([])
  })
})
