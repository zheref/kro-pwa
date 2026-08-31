import { describe, expect, it } from 'vitest'
import { EndeavorKind } from '../../domain/endeavor/EndeavorKind'
import { EndeavorTag } from '../../domain/endeavor/EndeavorTag'
import { makePerformFragment } from '../../domain/endeavor/Perform'
import {
  dailyBase,
  makeRepeatConfig,
  monthlyBase,
  weeklyBase,
  yearlyBase,
} from '../../domain/endeavor/RepeatConfig'
import { makeShadow } from '../../domain/endeavor/Shadow'
import { Month } from '../../domain/shared/Month'
import { AuthProvider } from '../../domain/shared/User'
import { WeekDay } from '../../domain/shared/WeekDay'
import {
  decodeConnectedProvidersCsv,
  decodeEmailsCsv,
  decodePerformFragment,
  decodeRepeatConfigJson,
  decodeSessionFragmentsJson,
  decodeShadow,
  decodeShadowsJson,
  decodeTagsCsv,
  encodeConnectedProvidersCsv,
  encodeEmailsCsv,
  encodeRepeatConfigJson,
  encodeSessionFragmentsJson,
  encodeShadow,
  encodeShadowsJson,
  encodeTagsCsv,
} from '../RecordEncodings'

describe('tagsCsv — the single-letter raw values, comma-joined', () => {
  it('writes the letters canon writes, not the case names', () => {
    expect(
      encodeTagsCsv([
        EndeavorTag.onDesk,
        EndeavorTag.duringPerformanceActivity,
        EndeavorTag.session,
      ]),
    ).toBe('O,D,S')
  })

  it('round-trips a tagged endeavor exactly', () => {
    const tags = [EndeavorTag.engaging, EndeavorTag.replica]
    expect(decodeTagsCsv(encodeTagsCsv(tags))).toEqual(tags)
  })

  it('drops a letter no Tag names, rather than failing the whole row', () => {
    expect(decodeTagsCsv('O,Z,S')).toEqual([
      EndeavorTag.onDesk,
      EndeavorTag.session,
    ])
  })

  it('reads an empty column as `null` — the never-tagged state', () => {
    expect(decodeTagsCsv('')).toBeNull()
  })

  it('collapses `[]` to `null`: the ONE documented lossy normalization', () => {
    // Canon's column cannot tell an empty list from an absent one — both encode
    // to "". Pinned so it reads as a decision, not as a bug in the round-trip.
    expect(encodeTagsCsv([])).toBe('')
    expect(decodeTagsCsv(encodeTagsCsv([]))).toBeNull()
  })

  it('encodes `null` and `[]` to the same column, as canon does', () => {
    expect(encodeTagsCsv(null)).toBe(encodeTagsCsv([]))
  })
})

describe('emailsCsv / connectedServicesCsv — the profile columns', () => {
  it('joins addresses with a comma', () => {
    expect(encodeEmailsCsv(['a@kro.app', 'b@kro.app'])).toBe(
      'a@kro.app,b@kro.app',
    )
  })

  it('reads an empty emails column as `[]`, not `null` — User.emails is required', () => {
    expect(decodeEmailsCsv('')).toEqual([])
  })

  it('round-trips a multi-address profile', () => {
    const emails = ['ada@kro.app', 'ada.lovelace@example.com']
    expect(decodeEmailsCsv(encodeEmailsCsv(emails))).toEqual(emails)
  })

  it('reads a NULL providers column as `[]` — the column is optional', () => {
    expect(decodeConnectedProvidersCsv(null)).toEqual([])
  })

  it('drops a provider raw value nothing names, per canon`s compactMap', () => {
    expect(decodeConnectedProvidersCsv('google,myspace,apple')).toEqual([
      AuthProvider.google,
      AuthProvider.apple,
    ])
  })

  it('round-trips the providers a user has connected', () => {
    const providers = [AuthProvider.emailPassword, AuthProvider.google]
    expect(
      decodeConnectedProvidersCsv(encodeConnectedProvidersCsv(providers)),
    ).toEqual(providers)
  })
})

describe('shadowsJson — Swift`s synthesized Codable, key for key', () => {
  const full = makeShadow({
    originalTitle: 'Renew passport',
    sourceIdentifier: 'reminders-x-4410',
    kind: EndeavorKind.reminder,
    source: 'appleReminders',
    group: 'Errands',
    appleReminderPriority: 0,
  })

  it('writes the property names in canon`s declaration order', () => {
    expect(Object.keys(encodeShadow(full))).toEqual([
      'originalTitle',
      'sourceIdentifier',
      'kind',
      'source',
      'group',
      'appleReminderPriority',
    ])
  })

  it('OMITS a nil optional rather than writing null — encodeIfPresent', () => {
    const bare = makeShadow({
      originalTitle: 'Cook Breakfast',
      sourceIdentifier: 'gcal-8891',
      kind: EndeavorKind.calendarEvent,
      source: 'googleCalendar',
      group: null,
    })
    expect(Object.keys(encodeShadow(bare))).toEqual([
      'originalTitle',
      'sourceIdentifier',
      'kind',
      'source',
    ])
    expect(JSON.stringify(encodeShadow(bare))).not.toContain('null')
  })

  it('keeps priority 0 — it means "no priority", not "unknown"', () => {
    expect(encodeShadow(full).appleReminderPriority).toBe(0)
    expect(decodeShadow(encodeShadow(full))?.appleReminderPriority).toBe(0)
  })

  it('round-trips a list of shadows exactly', () => {
    const shadows = [full]
    expect(decodeShadowsJson(encodeShadowsJson(shadows))).toEqual(shadows)
  })

  it('distinguishes `null` from `[]`, unlike tagsCsv', () => {
    expect(encodeShadowsJson(null)).toBeNull()
    expect(encodeShadowsJson([])).toBe('[]')
    expect(decodeShadowsJson('[]')).toEqual([])
    expect(decodeShadowsJson(null)).toBeNull()
  })

  it('drops an entry whose kind names nothing, keeping the rest', () => {
    const json = JSON.stringify([
      { ...encodeShadow(full), kind: 'telepathy' },
      encodeShadow(full),
    ])
    expect(decodeShadowsJson(json)).toHaveLength(1)
  })

  it('reads a malformed column as absent, never as a throw', () => {
    expect(decodeShadowsJson('{not json')).toBeNull()
  })
})

describe('repeatConfigJson — all four bases, through #7`s pinned codec', () => {
  it('round-trips a daily rule', () => {
    const config = makeRepeatConfig(dailyBase())
    expect(decodeRepeatConfigJson(encodeRepeatConfigJson(config))).toEqual(
      config,
    )
  })

  it('round-trips a weekly rule with an everyOther multiplier', () => {
    const config = makeRepeatConfig(
      weeklyBase([WeekDay.monday, WeekDay.wednesday, WeekDay.friday]),
      2,
    )
    expect(decodeRepeatConfigJson(encodeRepeatConfigJson(config))).toEqual(
      config,
    )
  })

  it('round-trips a monthly rule', () => {
    const config = makeRepeatConfig(monthlyBase(15))
    expect(decodeRepeatConfigJson(encodeRepeatConfigJson(config))).toEqual(
      config,
    )
  })

  it('round-trips a yearly rule, with month as a NUMBER on the wire', () => {
    const config = makeRepeatConfig(yearlyBase(3, Month.july))
    const json = encodeRepeatConfigJson(config)
    expect(json).toContain('"month":7')
    expect(decodeRepeatConfigJson(json)).toEqual(config)
  })

  it('reads a malformed rule as "no recurrence", never as a throw', () => {
    expect(decodeRepeatConfigJson('{"base":{"type":"lunar"}}')).toBeNull()
  })

  it('writes null for no recurrence at all', () => {
    expect(encodeRepeatConfigJson(null)).toBeNull()
  })
})

describe('sessionFragmentsJson — Apple`s reference epoch, not ISO-8601', () => {
  const startedAt = new Date(Date.UTC(2026, 0, 15, 9, 0, 0))
  const endedAt = new Date(Date.UTC(2026, 0, 15, 9, 25, 0))

  it('writes seconds since 2001-01-01, as a bare JSONEncoder does', () => {
    const json = encodeSessionFragmentsJson([
      makePerformFragment({ startedAt, endedAt }),
    ])
    expect(json).toBe('[{"startedAt":790160400,"endedAt":790161900}]')
  })

  it('never writes an ISO string — the blob Swift would reject', () => {
    const json = encodeSessionFragmentsJson([
      makePerformFragment({ startedAt, endedAt }),
    ])
    expect(json).not.toContain('2026-')
  })

  it('OMITS endedAt while the fragment is still open', () => {
    const json = encodeSessionFragmentsJson([
      makePerformFragment({ startedAt, endedAt: null }),
    ])
    expect(json).toBe('[{"startedAt":790160400}]')
  })

  it('round-trips two fragments, open one included', () => {
    const fragments = [
      makePerformFragment({ startedAt, endedAt }),
      makePerformFragment({ startedAt: endedAt, endedAt: null }),
    ]
    expect(
      decodeSessionFragmentsJson(encodeSessionFragmentsJson(fragments)),
    ).toEqual(fragments)
  })

  it('reads an absent column as no fragments — canon`s `?? []`', () => {
    expect(decodeSessionFragmentsJson(null)).toEqual([])
  })

  it('reads a malformed column as no fragments rather than throwing', () => {
    expect(decodeSessionFragmentsJson('[[[')).toEqual([])
  })

  it('drops an entry with no startedAt, keeping the readable ones', () => {
    expect(
      decodeSessionFragmentsJson('[{"endedAt":1},{"startedAt":790160400}]'),
    ).toHaveLength(1)
  })

  it('decodes one fragment entry back to the exact instant', () => {
    expect(
      decodePerformFragment({ startedAt: 790_160_400 })?.startedAt,
    ).toEqual(startedAt)
  })
})
