import { EndeavorKind, EndeavorStatus, makeEndeavor } from '@kro/core'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REWARD_POINTS,
  EndeavorUrgency,
  FALLBACK_SYMBOL,
  computedReward,
  computedSymbol,
  computedUrgency,
  displayTitle,
  endeavorCardModelFrom,
  leadingEmoji,
  urgencyDisplayTitle,
  urgencyIconSymbol,
  urgencyShowsWarning,
} from './endeavorCardModel'

const NOW = new Date(2026, 3, 15, 14, 0, 0)
const hoursFromNow = (count: number) => new Date(NOW.getTime() + count * 3_600_000)

describe('computedUrgency', () => {
  it('is High once the due moment has passed — an overdue tax receipt', () => {
    expect(computedUrgency({ due: hoursFromNow(-0.1) }, NOW)).toBe(EndeavorUrgency.high)
  })

  it('is Medium inside the two-hour window — a stand-up at 3:30', () => {
    expect(computedUrgency({ due: hoursFromNow(1.5) }, NOW)).toBe(EndeavorUrgency.medium)
  })

  it('is Low beyond the window — groceries this evening', () => {
    expect(computedUrgency({ due: hoursFromNow(5) }, NOW)).toBe(EndeavorUrgency.low)
  })

  it('is Low when there is no due date at all', () => {
    expect(computedUrgency({ due: null }, NOW)).toBe(EndeavorUrgency.low)
  })

  it('treats exactly two hours as Medium — canon compares <=, not <', () => {
    expect(computedUrgency({ due: hoursFromNow(2) }, NOW)).toBe(EndeavorUrgency.medium)
  })

  it('is still Medium at the exact due instant — canon compares due < now, strictly', () => {
    expect(computedUrgency({ due: NOW }, NOW)).toBe(EndeavorUrgency.medium)
  })
})

describe('the urgency projections', () => {
  it('shows the floating warning for MEDIUM only — High already shouts', () => {
    expect(urgencyShowsWarning(EndeavorUrgency.medium)).toBe(true)
    expect(urgencyShowsWarning(EndeavorUrgency.high)).toBe(false)
    expect(urgencyShowsWarning(EndeavorUrgency.low)).toBe(false)
  })

  it('names each level the way the pill prints it', () => {
    expect(urgencyDisplayTitle(EndeavorUrgency.low)).toBe('Low')
    expect(urgencyDisplayTitle(EndeavorUrgency.medium)).toBe('Medium')
    expect(urgencyDisplayTitle(EndeavorUrgency.high)).toBe('High')
  })

  it('escalates the glyph with the level, so the pill is legible in grayscale', () => {
    expect(urgencyIconSymbol(EndeavorUrgency.low)).toBe('arrow.down.circle')
    expect(urgencyIconSymbol(EndeavorUrgency.medium)).toBe('exclamationmark.circle')
    expect(urgencyIconSymbol(EndeavorUrgency.high)).toBe('exclamationmark.circle.fill')
  })
})

describe('computedReward', () => {
  it('reads the endeavor’s own session points — a 50-point deliverable', () => {
    expect(computedReward({ sessionPoints: 50 })).toBe(50)
  })

  it('falls back to ten when none are set — canon’s default', () => {
    expect(computedReward({ sessionPoints: null })).toBe(DEFAULT_REWARD_POINTS)
  })

  it('keeps an explicit zero rather than treating it as absent', () => {
    expect(computedReward({ sessionPoints: 0 })).toBe(0)
  })
})

describe('leadingEmoji and displayTitle', () => {
  it('lifts a leading emoji off the title — "📊 Prepare slides"', () => {
    expect(leadingEmoji('📊 Prepare slides')).toBe('📊')
    expect(displayTitle('📊 Prepare slides')).toBe('Prepare slides')
  })

  it('keeps a ZWJ sequence whole — "👩‍💻" is one symbol, not two', () => {
    expect(leadingEmoji('👩‍💻 Pair on the port')).toBe('👩‍💻')
    expect(displayTitle('👩‍💻 Pair on the port')).toBe('Pair on the port')
  })

  it('keeps a variation selector with its base — "🏋️" survives intact', () => {
    expect(leadingEmoji('🏋️ Gym')).toBe('🏋️')
  })

  it('does NOT treat a leading digit as an emoji — "1:1 with Sam" keeps its 1', () => {
    // Swift reports "1" as an emoji (keycap bases are), which is why canon has
    // a second `isNumber == false` clause. `Extended_Pictographic` excludes it
    // by definition.
    expect(leadingEmoji('1:1 with Sam')).toBeNull()
    expect(displayTitle('1:1 with Sam')).toBe('1:1 with Sam')
  })

  it('leaves an ordinary title untouched', () => {
    expect(leadingEmoji('Buy groceries')).toBeNull()
    expect(displayTitle('Buy groceries')).toBe('Buy groceries')
  })

  it('strips every space between the emoji and the first word', () => {
    expect(displayTitle('🛒   Buy groceries')).toBe('Buy groceries')
  })
})

describe('computedSymbol', () => {
  it('prefers the title’s own emoji over the keyword table', () => {
    expect(computedSymbol('🎫 Review the code')).toBe('🎫')
  })

  it('matches keywords in canon’s order — "review the code" is 💻, not 📚', () => {
    expect(computedSymbol('Review the code')).toBe('💻')
  })

  it('is case-insensitive — "Buy Groceries" still finds the cart', () => {
    expect(computedSymbol('Buy Groceries')).toBe('🛒')
  })

  it('falls back to the clipboard when nothing matches', () => {
    expect(computedSymbol('Think about it')).toBe(FALLBACK_SYMBOL)
  })
})

describe('endeavorCardModelFrom', () => {
  const base = makeEndeavor({
    id: 'e1',
    title: '📊 Prepare presentation slides',
    kind: EndeavorKind.task,
    status: EndeavorStatus.pending,
    due: hoursFromNow(1),
    duration: 45 * 60,
    sessionPoints: 50,
  })

  it('maps a due task into the card’s view model, warning and all', () => {
    const model = endeavorCardModelFrom(base, NOW)

    expect(model).toMatchObject({
      id: 'e1',
      urgency: EndeavorUrgency.medium,
      reward: 50,
      symbol: '📊',
      title: 'Prepare presentation slides',
      duration: 45 * 60,
      showWarning: true,
      isEvent: false,
    })
    expect(model.dueTime?.getTime()).toBe(hoursFromNow(1).getTime())
  })

  it('reads an event’s START as its time reference, never its due date', () => {
    const event = makeEndeavor({
      id: 'e2',
      title: 'Team sync meeting',
      kind: EndeavorKind.calendarEvent,
      status: EndeavorStatus.planned,
      start: hoursFromNow(3),
      due: hoursFromNow(9),
      duration: 3600,
    })

    const model = endeavorCardModelFrom(event, NOW)

    expect(model.isEvent).toBe(true)
    expect(model.dueTime?.getTime()).toBe(hoursFromNow(3).getTime())
  })

  it('leaves an endeavor with nothing set fully blank rather than inventing values', () => {
    const bare = makeEndeavor({
      id: 'e3',
      title: 'Think about it',
      kind: EndeavorKind.task,
    })
    const model = endeavorCardModelFrom(bare, NOW)

    expect(model.dueTime).toBeNull()
    expect(model.duration).toBeNull()
    expect(model.reward).toBe(DEFAULT_REWARD_POINTS)
    expect(model.symbol).toBe(FALLBACK_SYMBOL)
    expect(model.urgency).toBe(EndeavorUrgency.low)
    expect(model.showWarning).toBe(false)
  })
})
