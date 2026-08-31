import { describe, expect, it } from 'vitest'
import {
  EndeavorCaptionSource,
  EndeavorStatus,
  compareEndeavorStatuses,
  endeavorStatusCaptionPrefix,
  endeavorStatusCaptionSource,
  endeavorStatusDisplayName,
  endeavorStatusFromRawValue,
  endeavorStatusIndexValue,
  endeavorStatusIsBefore,
  endeavorStatuses,
} from '../EndeavorStatus'

describe('EndeavorStatus canon parity', () => {
  it('has exactly canon’s ten states, in declaration order', () => {
    expect(endeavorStatuses).toEqual([
      'pending',
      'planned',
      'ongoing',
      'paused',
      'reviewing',
      'delegated',
      'qa',
      'blocked',
      'closed',
      'skipped',
    ])
  })

  it('lists every declared member exactly once', () => {
    expect(new Set(endeavorStatuses).size).toBe(endeavorStatuses.length)
    expect(endeavorStatuses.length).toBe(Object.keys(EndeavorStatus).length)
  })

  it('round-trips every raw value', () => {
    for (const status of endeavorStatuses) {
      expect(endeavorStatusFromRawValue(status)).toBe(status)
    }
    expect(endeavorStatusFromRawValue('archived')).toBeNull()
  })
})

describe('endeavorStatusIndexValue', () => {
  it('gives blocked the canon −1, ahead of everything else', () => {
    expect(endeavorStatusIndexValue(EndeavorStatus.blocked)).toBe(-1)
  })

  it('anchors ongoing at 0 and skipped at 8', () => {
    expect(endeavorStatusIndexValue(EndeavorStatus.ongoing)).toBe(0)
    expect(endeavorStatusIndexValue(EndeavorStatus.skipped)).toBe(8)
  })

  it('matches canon for all ten', () => {
    expect(
      Object.fromEntries(
        endeavorStatuses.map((status) => [status, endeavorStatusIndexValue(status)]),
      ),
    ).toEqual({
      blocked: -1,
      ongoing: 0,
      planned: 1,
      paused: 2,
      pending: 3,
      delegated: 4,
      qa: 5,
      reviewing: 6,
      closed: 7,
      skipped: 8,
    })
  })

  it('assigns a distinct index to every state', () => {
    const indices = endeavorStatuses.map(endeavorStatusIndexValue)
    expect(new Set(indices).size).toBe(indices.length)
  })
})

describe('ordering', () => {
  it('sorts by indexValue, not by declaration order', () => {
    expect([...endeavorStatuses].sort(compareEndeavorStatuses)).toEqual([
      'blocked',
      'ongoing',
      'planned',
      'paused',
      'pending',
      'delegated',
      'qa',
      'reviewing',
      'closed',
      'skipped',
    ])
  })

  it('puts blocked ahead of ongoing even though ongoing is index 0', () => {
    expect(
      endeavorStatusIsBefore(EndeavorStatus.blocked, EndeavorStatus.ongoing),
    ).toBe(true)
  })

  it('is strict — a state does not precede itself', () => {
    for (const status of endeavorStatuses) {
      expect(endeavorStatusIsBefore(status, status)).toBe(false)
      expect(compareEndeavorStatuses(status, status)).toBe(0)
    }
  })

  it('is antisymmetric across every pair', () => {
    for (const left of endeavorStatuses) {
      for (const right of endeavorStatuses) {
        if (left === right) continue
        expect(endeavorStatusIsBefore(left, right)).toBe(
          !endeavorStatusIsBefore(right, left),
        )
      }
    }
  })
})

describe('endeavorStatusDisplayName', () => {
  it('renders `qa` in full caps', () => {
    expect(endeavorStatusDisplayName(EndeavorStatus.qa)).toBe('QA')
  })

  it('title-cases the other nine', () => {
    expect(endeavorStatusDisplayName(EndeavorStatus.pending)).toBe('Pending')
    expect(endeavorStatusDisplayName(EndeavorStatus.delegated)).toBe('Delegated')
  })

  it('names all ten, each distinctly', () => {
    const names = endeavorStatuses.map(endeavorStatusDisplayName)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('endeavorStatusCaptionPrefix', () => {
  it('keeps canon’s trailing space, which is the separator', () => {
    expect(endeavorStatusCaptionPrefix(EndeavorStatus.pending)).toBe('Due ')
    expect(endeavorStatusCaptionPrefix(EndeavorStatus.closed)).toBe('Completed ')
  })

  it('uses "Blocked Since " and "Paused Since " for the two since-states', () => {
    expect(endeavorStatusCaptionPrefix(EndeavorStatus.blocked)).toBe('Blocked Since ')
    expect(endeavorStatusCaptionPrefix(EndeavorStatus.paused)).toBe('Paused Since ')
  })

  it('matches canon for all ten', () => {
    expect(
      Object.fromEntries(
        endeavorStatuses.map((status) => [
          status,
          endeavorStatusCaptionPrefix(status),
        ]),
      ),
    ).toEqual({
      blocked: 'Blocked Since ',
      closed: 'Completed ',
      delegated: 'Due ',
      paused: 'Paused Since ',
      pending: 'Due ',
      planned: 'Due ',
      ongoing: 'Due ',
      qa: 'Completed ',
      reviewing: 'Completed ',
      skipped: 'Due ',
    })
  })
})

describe('endeavorStatusCaptionSource', () => {
  it('reads `due` relatively for the five due-states', () => {
    for (const status of [
      EndeavorStatus.delegated,
      EndeavorStatus.pending,
      EndeavorStatus.planned,
      EndeavorStatus.ongoing,
      EndeavorStatus.skipped,
    ]) {
      expect(endeavorStatusCaptionSource(status)).toBe(
        EndeavorCaptionSource.dueRelative,
      )
    }
  })

  it('reads completion relatively for `closed` but absolutely for qa/reviewing', () => {
    expect(endeavorStatusCaptionSource(EndeavorStatus.closed)).toBe(
      EndeavorCaptionSource.completionRelative,
    )
    expect(endeavorStatusCaptionSource(EndeavorStatus.qa)).toBe(
      EndeavorCaptionSource.completionAbsolute,
    )
    expect(endeavorStatusCaptionSource(EndeavorStatus.reviewing)).toBe(
      EndeavorCaptionSource.completionAbsolute,
    )
  })

  it('points the two since-states at their own (still unbacked) sources', () => {
    expect(endeavorStatusCaptionSource(EndeavorStatus.blocked)).toBe(
      EndeavorCaptionSource.blockedSince,
    )
    expect(endeavorStatusCaptionSource(EndeavorStatus.paused)).toBe(
      EndeavorCaptionSource.pausedSince,
    )
  })

  it('pairs every state’s prefix with a caption source', () => {
    for (const status of endeavorStatuses) {
      expect(endeavorStatusCaptionPrefix(status).length).toBeGreaterThan(0)
      expect(endeavorStatusCaptionSource(status)).toBeTruthy()
    }
  })
})
