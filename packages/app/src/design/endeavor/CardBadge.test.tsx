import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CardBadge,
  REWARD_BACKGROUND_ROLE,
  REWARD_FOREGROUND_ROLE,
  RewardBadge,
  URGENCY_BACKGROUND_ROLE,
  UrgencyBadge,
  urgencyForegroundRole,
} from './CardBadge'
import { EndeavorUrgency, endeavorUrgencies } from './endeavorCardModel'

afterEach(cleanup)

describe('CardBadge geometry — a cross-platform contract, not a style choice', () => {
  it('is a 20px capsule with canon’s 6/3 padding and 2px gap', () => {
    render(<CardBadge backgroundRole="athensGray" foregroundRole="payneGray" title="High" />)

    const className = screen.getByText('High').className
    expect(className).toContain('h-5')
    expect(className).toContain('px-1.5')
    expect(className).toContain('py-[3px]')
    expect(className).toContain('gap-0.5')
    expect(className).toContain('rounded-kro-pill')
  })

  it('drops to a 20px circle in compact form, keeping the spoken name', () => {
    render(
      <CardBadge
        backgroundRole="athensGray"
        foregroundRole="payneGray"
        iconSymbol="exclamationmark.circle"
        title="Medium"
        compact
      />,
    )

    const badge = screen.getByLabelText('Medium')
    expect(badge.className).toContain('size-5')
    expect(badge.textContent).toBe('')
  })
})

describe('UrgencyBadge', () => {
  it('paints every level on AthensGray — canon uses one fill for all three', () => {
    for (const urgency of endeavorUrgencies) {
      expect(URGENCY_BACKGROUND_ROLE).toBe('athensGray')
      expect(urgencyForegroundRole(urgency)).not.toBe(URGENCY_BACKGROUND_ROLE)
    }
  })

  it('reads grey / orange / red, escalating with the level', () => {
    expect(urgencyForegroundRole(EndeavorUrgency.low)).toBe('payneGray')
    expect(urgencyForegroundRole(EndeavorUrgency.medium)).toBe('bannerWarning')
    expect(urgencyForegroundRole(EndeavorUrgency.high)).toBe('bannerDanger')
  })

  it('uses only FIXED-VALUE roles, because the fill does not flip with the scheme', () => {
    // A scheme-flipping badge token would lighten in dark mode while AthensGray
    // stayed light, taking the pair to roughly 2:1 exactly where it looks safe.
    const fixed = new Set(['payneGray', 'bannerWarning', 'bannerDanger'])
    for (const urgency of endeavorUrgencies) {
      expect(fixed.has(urgencyForegroundRole(urgency))).toBe(true)
    }
  })

  it('prints the level as a word, so the pill survives grayscale', () => {
    render(<UrgencyBadge urgency={EndeavorUrgency.high} />)
    expect(screen.getByText('High')).not.toBeNull()
  })
})

describe('RewardBadge', () => {
  it('shows the amount and speaks it as points, not as a bare number', () => {
    render(<RewardBadge amount={50} />)

    const badge = screen.getByLabelText('50 reward points')
    expect(badge.textContent).toContain('50')
  })

  it('sits on ScotchMist with a fixed-value label, for the same reason as urgency', () => {
    expect(REWARD_BACKGROUND_ROLE).toBe('scotchMist')
    expect(REWARD_FOREGROUND_ROLE).toBe('bannerWarning')
  })

  it('renders a zero reward rather than hiding the pill', () => {
    // Canon shows the reward pill ALWAYS. A card with no pill would read as a
    // card with no reward system, not as a zero-point task.
    render(<RewardBadge amount={0} />)
    expect(screen.getByLabelText('0 reward points')).not.toBeNull()
  })
})
