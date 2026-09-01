import { describe, expect, it } from 'vitest'
import {
  EndeavorHost,
  endeavorHostDisplayName,
  endeavorHostFromRawValue,
  endeavorHostIcon,
  endeavorHosts,
  isKroOwnedHost,
  kroOwnedHosts,
} from '../EndeavorHost'

describe('EndeavorHost canon parity', () => {
  it('has exactly canon’s six hosts, in declaration order', () => {
    expect(endeavorHosts).toEqual([
      'supabase',
      'local',
      'appleCalendar',
      'googleCalendar',
      'outlookCalendar',
      'appleReminders',
    ])
  })

  it('lists every declared member exactly once', () => {
    expect(new Set(endeavorHosts).size).toBe(endeavorHosts.length)
    expect(endeavorHosts.length).toBe(Object.keys(EndeavorHost).length)
  })

  it('round-trips every raw value', () => {
    for (const host of endeavorHosts) {
      expect(endeavorHostFromRawValue(host)).toBe(host)
    }
    expect(endeavorHostFromRawValue('dropbox')).toBeNull()
  })
})

describe('endeavorHostDisplayName', () => {
  it('renders `supabase` as "Kro" — the product name, not the vendor', () => {
    expect(endeavorHostDisplayName(EndeavorHost.supabase)).toBe('Kro')
  })

  it('shortens the two Apple hosts to their app names', () => {
    expect(endeavorHostDisplayName(EndeavorHost.appleCalendar)).toBe('Calendar')
    expect(endeavorHostDisplayName(EndeavorHost.appleReminders)).toBe(
      'Reminders',
    )
  })

  it('spells the two third-party calendars out in full', () => {
    expect(endeavorHostDisplayName(EndeavorHost.googleCalendar)).toBe(
      'Google Calendar',
    )
    expect(endeavorHostDisplayName(EndeavorHost.outlookCalendar)).toBe(
      'Outlook Calendar',
    )
  })

  it('names all six, each distinctly', () => {
    const names = endeavorHosts.map(endeavorHostDisplayName)
    expect(names).toEqual([
      'Kro',
      'Local',
      'Calendar',
      'Google Calendar',
      'Outlook Calendar',
      'Reminders',
    ])
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('endeavorHostIcon', () => {
  it('maps every host to its canon SF Symbol', () => {
    expect(endeavorHosts.map(endeavorHostIcon)).toEqual([
      { type: 'glyph', name: 'network' },
      { type: 'glyph', name: 'memorychip' },
      { type: 'glyph', name: 'calendar' },
      { type: 'glyph', name: 'g.circle.fill' },
      { type: 'glyph', name: 'm.square.fill' },
      { type: 'glyph', name: 'checklist' },
    ])
  })

  it('gives each host a distinct glyph', () => {
    const names = endeavorHosts.map((host) => {
      const icon = endeavorHostIcon(host)
      return icon.type === 'glyph' ? icon.name : icon.value
    })
    expect(new Set(names).size).toBe(names.length)
  })

  it('never returns an emoji case', () => {
    for (const host of endeavorHosts) {
      expect(endeavorHostIcon(host).type).toBe('glyph')
    }
  })
})

describe('isKroOwnedHost', () => {
  it('counts supabase and local as Kro-owned', () => {
    expect(kroOwnedHosts).toEqual(['supabase', 'local'])
    expect(isKroOwnedHost(EndeavorHost.supabase)).toBe(true)
    expect(isKroOwnedHost(EndeavorHost.local)).toBe(true)
  })

  it('counts every calendar and reminders provider as external', () => {
    expect(isKroOwnedHost(EndeavorHost.appleCalendar)).toBe(false)
    expect(isKroOwnedHost(EndeavorHost.googleCalendar)).toBe(false)
    expect(isKroOwnedHost(EndeavorHost.outlookCalendar)).toBe(false)
    expect(isKroOwnedHost(EndeavorHost.appleReminders)).toBe(false)
  })

  it('partitions the six hosts two-to-four', () => {
    expect(endeavorHosts.filter(isKroOwnedHost)).toHaveLength(2)
    expect(endeavorHosts.filter((host) => !isKroOwnedHost(host))).toHaveLength(
      4,
    )
  })
})
