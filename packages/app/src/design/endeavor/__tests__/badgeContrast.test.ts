/**
 * The contrast contracts this kit introduces, measured from `tokens.css`.
 *
 * The design system's own suite (`contrastContracts.ts`) measures the pairings
 * that existed when it was written. Three of this kit's pairings are new, and
 * two of them are the reason the card's foregrounds depart from canon at all:
 *
 *   · the urgency label on `AthensGray`,
 *   · the reward label on `ScotchMist`,
 *   · the banner body line on the two opaque banner fills.
 *
 * They are measured HERE rather than added to `contrastContracts.ts` because
 * that file belongs to the design-system child's lane and this one does not
 * touch it. The numbers are read from the stylesheet at run time through the
 * same `tokenSource` the system suite uses, so a token re-tune fails this test
 * rather than quietly darkening a pill.
 *
 * FOLLOW-UP, stated rather than left implicit: `contrastContracts.ts` currently
 * files `athensGray` and `scotchMist` under `UNMEASURED_ROLES` with the reason
 * *"decorative card wash; never carries text"*. This kit makes both carry text.
 * Moving those two roles into a contract there — and deleting this file — is a
 * small edit for whichever child next owns `design/system/tokens`.
 */

import { describe, expect, it } from 'vitest'
import { AA_NON_TEXT, AA_TEXT, ratioBetween } from '../../system/tokens/contrast'
import { COLOR_ROLE_VARS } from '../../system/tokens/roles'
import type { ColorRole } from '../../system/tokens/roles'
import { type Theme, resolveToken } from '../../system/tokens/tokenSource'
import {
  REWARD_BACKGROUND_ROLE,
  REWARD_FOREGROUND_ROLE,
  URGENCY_BACKGROUND_ROLE,
  urgencyForegroundRole,
} from '../CardBadge'
import { endeavorUrgencies } from '../endeavorCardModel'
import { onFillRole } from '../rowActions'

const THEMES: readonly Theme[] = ['light', 'dark']

function value(role: ColorRole, theme: Theme = 'light'): string {
  return resolveToken(COLOR_ROLE_VARS[role], theme)
}

describe('the urgency pill', () => {
  it('clears AA text contrast at every level, in BOTH schemes', () => {
    for (const theme of THEMES) {
      const fill = value(URGENCY_BACKGROUND_ROLE, theme)
      for (const urgency of endeavorUrgencies) {
        const label = value(urgencyForegroundRole(urgency), theme)
        const ratio = ratioBetween(label, fill)
        expect(ratio, `${urgency} on ${URGENCY_BACKGROUND_ROLE} (${theme})`).toBeGreaterThanOrEqual(
          AA_TEXT,
        )
      }
    }
  })

  it('has a fill that does NOT flip with the scheme — canon parity, and the reason for the fixed labels', () => {
    expect(value(URGENCY_BACKGROUND_ROLE, 'light')).toBe(
      value(URGENCY_BACKGROUND_ROLE, 'dark'),
    )
  })

  it('has labels that do not flip either, so the measured pair is the drawn pair', () => {
    for (const urgency of endeavorUrgencies) {
      const role = urgencyForegroundRole(urgency)
      expect(value(role, 'light'), `${role} flips`).toBe(value(role, 'dark'))
    }
  })

  it('would FAIL with the scheme-flipping badge palette — the measurement that forced the change', () => {
    // Documented as a test rather than as a comment, because the tempting
    // "just use badgeOrange" edit looks correct in light mode.
    const fill = value(URGENCY_BACKGROUND_ROLE, 'dark')
    expect(ratioBetween(value('badgeOrange', 'dark'), fill)).toBeLessThan(AA_TEXT)
    expect(ratioBetween(value('badgeRed', 'dark'), fill)).toBeLessThan(AA_TEXT)
  })
})

describe('the reward pill', () => {
  it('clears AA text contrast in both schemes', () => {
    for (const theme of THEMES) {
      const ratio = ratioBetween(
        value(REWARD_FOREGROUND_ROLE, theme),
        value(REWARD_BACKGROUND_ROLE, theme),
      )
      expect(ratio, `reward label (${theme})`).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })

  it('would FAIL with canon’s own gold — the measurement behind the adaptation', () => {
    // Canon's `Color(red: 0.6, green: 0.5, blue: 0.0)` is #997F00.
    expect(ratioBetween('#997f00', value(REWARD_BACKGROUND_ROLE, 'light'))).toBeLessThan(
      AA_TEXT,
    )
  })
})

describe('a glyph on an action fill', () => {
  /** Every fill this kit paints a circular action or a swipe block with. */
  const ACTION_FILLS: readonly ColorRole[] = [
    'badgeGreen',
    'badgeBlue',
    'badgeOrange',
    'badgeRed',
    'badgePurple',
    'badgeNeutral',
    'charcoal',
  ]

  it('clears the 3:1 graphical-object floor once the label follows the scheme', () => {
    // `onFillRole` answers "white in light, black in dark" through `absolute`,
    // which is the design system's own chip contract. The next test is why that
    // indirection exists at all.
    for (const theme of THEMES) {
      for (const fill of ACTION_FILLS) {
        const ratio = ratioBetween(value(onFillRole(fill), theme), value(fill, theme))
        expect(ratio, `${fill} glyph (${theme})`).toBeGreaterThanOrEqual(AA_NON_TEXT)
      }
    }
  })

  it('would FAIL in dark mode with a fixed white glyph — the reason for `onFillRole`', () => {
    // The badge palette lightens in dark mode. A white glyph on the bright
    // variant measures roughly 2:1, which looks perfectly safe in light mode.
    for (const fill of ['badgeGreen', 'badgeOrange', 'badgeRed'] as const) {
      expect(
        ratioBetween('#ffffff', value(fill, 'dark')),
        `${fill} unexpectedly survives a white glyph`,
      ).toBeLessThan(AA_NON_TEXT)
    }
  })

  it('keeps canon’s WHITE checkmark on completeBlue, which does not lighten', () => {
    for (const theme of THEMES) {
      expect(
        ratioBetween('#ffffff', value('completeBlue', theme)),
        `complete checkmark (${theme})`,
      ).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
  })

  it('keeps the accent’s own label on the accent, never `absolute`', () => {
    // The accent is user-tunable and `useAccentColor` rewrites `onAccent` with
    // it. Freezing a scheme-based label there would break the moment the user
    // re-tints.
    expect(onFillRole('accent')).toBe('onAccent')
    expect(onFillRole('badgeGreen')).toBe('absolute')
  })
})

describe('the floating warning disc', () => {
  it('clears the 3:1 graphical-object floor thanks to its ring', () => {
    // Canon draws the yellow glyph on a bare white circle. On the card's white
    // surface that disc measures 1.9:1 — under SC 1.4.11 — so the port keeps
    // canon's yellow and gives the shape an amber boundary.
    for (const theme of THEMES) {
      expect(ratioBetween(value('ringGold'), value('snow', theme))).toBeLessThan(
        AA_NON_TEXT,
      )
      expect(
        ratioBetween(value('bannerWarning', theme), value('snow', theme)),
        `warning ring (${theme})`,
      ).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
  })
})

describe('the inline banner', () => {
  it('keeps its white title and 70% supporting line above AA on both fills', () => {
    for (const theme of THEMES) {
      for (const role of ['bannerWarning', 'bannerDanger'] as const) {
        const fill = value(role, theme)
        expect(ratioBetween('#ffffff', fill), `${role} title (${theme})`).toBeGreaterThanOrEqual(
          AA_TEXT,
        )
        expect(
          ratioBetween('rgb(255 255 255 / 0.7)', fill),
          `${role} detail (${theme})`,
        ).toBeGreaterThanOrEqual(AA_TEXT)
      }
    }
  })

  it('keeps the info banner’s text readable on the recessed surface it uses instead', () => {
    for (const theme of THEMES) {
      const fill = value('backInner', theme)
      expect(ratioBetween(value('fore', theme), fill)).toBeGreaterThanOrEqual(AA_TEXT)
      expect(ratioBetween(value('foreSecondary', theme), fill)).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })
})
