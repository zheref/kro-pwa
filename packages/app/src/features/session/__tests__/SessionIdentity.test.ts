/**
 * Identity editing from the sheet — canon's `replacingSymbol` and the
 * blank-"Focus Session" promotion rule.
 *
 * The emoji substitution is the fiddly half: it must land **at the glyph's
 * original position** so `📊 Prepare slides` becomes `💻 Prepare slides`, and
 * it must fall back to prepending when the title never carried the glyph at
 * all (canon's keyword-inferred case).
 */
import { EndeavorHost, EndeavorStatus, taskEndeavor } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  anonymousSessionIdentity,
  identityWithSymbol,
  identityWithTitle,
  isCommittableSessionTitle,
  leadingSymbolOfTitle,
  makeSessionIdentity,
  promotedEndeavorForIdentity,
  replacingSymbolInTitle,
  sessionIdentityForEndeavor,
  trimSessionTitle,
} from '../SessionIdentity'
import {
  ANONYMOUS_SESSION_SYMBOL,
  ANONYMOUS_SESSION_TITLE,
} from '../SessionVocabulary'

const NOW = new Date(2026, 2, 17, 9, 0, 0)

describe('replacingSymbolInTitle', () => {
  it('swaps the glyph in place — canon’s worked example', () => {
    expect(
      replacingSymbolInTitle({
        title: '📊 Prepare slides',
        oldSymbol: '📊',
        newSymbol: '💻',
      }),
    ).toBe('💻 Prepare slides')
  })

  it('prepends with a space when the title never carried the glyph', () => {
    expect(
      replacingSymbolInTitle({
        title: 'Prepare slides',
        oldSymbol: '📊',
        newSymbol: '💻',
      }),
    ).toBe('💻 Prepare slides')
  })

  it('returns the glyph alone for an empty title', () => {
    expect(
      replacingSymbolInTitle({ title: '', oldSymbol: '📊', newSymbol: '💻' }),
    ).toBe('💻')
  })

  it('replaces only the first occurrence, leaving a repeated glyph alone', () => {
    expect(
      replacingSymbolInTitle({
        title: '📊 review 📊 deck',
        oldSymbol: '📊',
        newSymbol: '💻',
      }),
    ).toBe('💻 review 📊 deck')
  })

  it('treats a `$&` in the title literally, not as a replacement pattern', () => {
    // A naive `replace` with a string replacement would expand `$&` here.
    expect(
      replacingSymbolInTitle({
        title: '📊 spend $& save',
        oldSymbol: '📊',
        newSymbol: '💻',
      }),
    ).toBe('💻 spend $& save')
  })

  it('prepends when the old glyph is empty, rather than corrupting the title', () => {
    expect(
      replacingSymbolInTitle({
        title: 'Prepare slides',
        oldSymbol: '',
        newSymbol: '💻',
      }),
    ).toBe('💻 Prepare slides')
  })
})

describe('leadingSymbolOfTitle', () => {
  it('reads the glyph a title opens with', () => {
    expect(leadingSymbolOfTitle('📊 Prepare slides')).toBe('📊')
  })

  it('answers null for a plain title — nothing to infer', () => {
    expect(leadingSymbolOfTitle('Prepare slides')).toBeNull()
  })

  it('answers null for a title whose glyph is not at the front', () => {
    expect(leadingSymbolOfTitle('Prepare 📊 slides')).toBeNull()
  })
})

describe('isCommittableSessionTitle', () => {
  const identity = makeSessionIdentity({
    endeavorId: 'e-1',
    title: 'Prepare slides',
  })

  it('commits a genuinely new title', () => {
    expect(isCommittableSessionTitle(identity, 'Prepare the deck')).toBe(true)
  })

  it('refuses a blank edit — canon reverts rather than wiping the name', () => {
    expect(isCommittableSessionTitle(identity, '   ')).toBe(false)
  })

  it('refuses an unchanged title, so an accidental tap writes nothing', () => {
    expect(isCommittableSessionTitle(identity, '  Prepare slides  ')).toBe(
      false,
    )
  })
})

describe('identityWithTitle', () => {
  const identity = makeSessionIdentity({ endeavorId: 'e-1', title: 'Old' })

  it('takes the trimmed value the user typed', () => {
    expect(identityWithTitle(identity, '  New title  ').title).toBe('New title')
  })

  it('leaves the glyph alone — a title edit is not a symbol edit', () => {
    expect(identityWithTitle(identity, 'New title').symbol).toBe(
      identity.symbol,
    )
  })

  it('keeps the id, so the anchor already written stays valid', () => {
    expect(identityWithTitle(identity, 'New title').endeavorId).toBe('e-1')
  })
})

describe('identityWithSymbol', () => {
  const identity = makeSessionIdentity({
    endeavorId: 'e-1',
    symbol: '📊',
    title: '📊 Prepare slides',
  })

  it('updates the glyph and the title together', () => {
    const next = identityWithSymbol(identity, '💻')
    expect(next.symbol).toBe('💻')
    expect(next.title).toBe('💻 Prepare slides')
  })

  it('returns the same object for an unchanged pick — canon’s guard', () => {
    expect(identityWithSymbol(identity, '📊')).toBe(identity)
  })

  it('returns the same object for an empty pick', () => {
    expect(identityWithSymbol(identity, '')).toBe(identity)
  })
})

describe('anonymousSessionIdentity', () => {
  it('opens as the blank "Focus Session" with the tomato glyph', () => {
    const identity = anonymousSessionIdentity('session-1')
    expect(identity.title).toBe(ANONYMOUS_SESSION_TITLE)
    expect(identity.symbol).toBe(ANONYMOUS_SESSION_SYMBOL)
  })

  it('is marked anonymous — nothing is stored behind it yet', () => {
    expect(anonymousSessionIdentity('session-1').isAnonymous).toBe(true)
  })

  it('takes the id the caller minted, never one of its own', () => {
    expect(anonymousSessionIdentity('session-1').endeavorId).toBe('session-1')
  })
})

describe('sessionIdentityForEndeavor', () => {
  const endeavor = taskEndeavor({
    id: 'e-1',
    title: '📊 Prepare slides',
    host: EndeavorHost.local,
  })

  it('infers the glyph from the title when the caller supplies none', () => {
    expect(sessionIdentityForEndeavor(endeavor).symbol).toBe('📊')
  })

  it('falls back to the tomato for a title with no glyph', () => {
    const plain = taskEndeavor({
      id: 'e-2',
      title: 'Prepare slides',
      host: EndeavorHost.local,
    })
    expect(sessionIdentityForEndeavor(plain).symbol).toBe(
      ANONYMOUS_SESSION_SYMBOL,
    )
  })

  it('is not anonymous — a stored row backs it', () => {
    expect(sessionIdentityForEndeavor(endeavor).isAnonymous).toBe(false)
  })

  it('lets a caller override the inferred glyph', () => {
    expect(sessionIdentityForEndeavor(endeavor, '🔥').symbol).toBe('🔥')
  })
})

describe('promotedEndeavorForIdentity', () => {
  it('commits the blank session with the title the edit produced', () => {
    const identity = identityWithSymbol(
      anonymousSessionIdentity('session-1'),
      '💻',
    )
    // Canon's worked example: picking 💻 on the default title.
    expect(promotedEndeavorForIdentity(identity, NOW).title).toBe(
      `💻 ${ANONYMOUS_SESSION_TITLE}`,
    )
  })

  it('keeps the session’s own id, so its anchor stays valid', () => {
    const identity = anonymousSessionIdentity('session-1')
    expect(promotedEndeavorForIdentity(identity, NOW).id).toBe('session-1')
  })

  it('is Kro-owned and open — never pre-closed', () => {
    const promoted = promotedEndeavorForIdentity(
      anonymousSessionIdentity('session-1'),
      NOW,
    )
    expect(promoted.hostedBy).toContain(EndeavorHost.local)
    expect(promoted.status).not.toBe(EndeavorStatus.closed)
  })
})

describe('trimSessionTitle', () => {
  it('drops surrounding whitespace the user did not mean', () => {
    expect(trimSessionTitle('  Prepare slides ')).toBe('Prepare slides')
  })

  it('leaves interior spacing alone', () => {
    expect(trimSessionTitle('Prepare  the  slides')).toBe(
      'Prepare  the  slides',
    )
  })

  it('collapses a whitespace-only edit to the empty string', () => {
    expect(trimSessionTitle('  \n ')).toBe('')
  })
})
