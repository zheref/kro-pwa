/**
 * The contrast regression suite — the web port of KroApple's
 * `KroTokensColorsContrastTests` (zheref/KroApple@2c1ee45).
 *
 * Every ratio below is computed from the text of `tokens.css`, not from a
 * TypeScript copy of the palette, so the suite cannot drift from what ships.
 * Editing a hex in the stylesheet is what makes this file fail.
 */

import { describe, expect, it } from 'vitest'
import { AA_TEXT, formatRatio, parseColor, ratioBetween } from './contrast'
import {
  CHIP_ROLES,
  LABEL_ON_FILL_ROLES,
  NON_TEXT_ROLES,
  THEMES,
  UNMEASURED_ROLES,
  measuredPairs,
  rolesUnderContract,
} from './contrastContracts'
import { COLOR_ROLES, COLOR_ROLE_VARS, SEMANTIC_ROLE_VARS } from './roles'
import { resolveToken } from './tokenSource'

const pairs = measuredPairs()

describe('KroTokens contrast — every declared pairing meets its WCAG floor', () => {
  const byContract = new Map<string, typeof pairs>()
  for (const pair of pairs) {
    const bucket = byContract.get(pair.contract) ?? []
    bucket.push(pair)
    byContract.set(pair.contract, bucket)
  }

  for (const [contract, bucket] of byContract) {
    describe(contract, () => {
      for (const pair of bucket) {
        it(`${pair.label} · ${pair.theme}`, () => {
          const ratio = ratioBetween(pair.foreground, pair.background)
          expect(
            ratio,
            `${pair.label} (${pair.theme}): ${pair.foreground} on ${pair.background} is ${formatRatio(ratio)}, floor ${pair.floor}:1`,
          ).toBeGreaterThanOrEqual(pair.floor)
        })
      }
    })
  }
})

describe('the suite measures the whole palette', () => {
  it('is not empty — a contract list that silently produced no pairs would pass vacuously', () => {
    expect(pairs.length).toBeGreaterThan(100)
  })

  it('classifies every declared colour role exactly once', () => {
    const covered = rolesUnderContract()
    const nonText = new Set(NON_TEXT_ROLES.map(({ role }) => role))
    const unmeasured = new Set(Object.keys(UNMEASURED_ROLES))

    const unclassified = COLOR_ROLES.filter(
      (role) =>
        !covered.has(role) && !nonText.has(role) && !unmeasured.has(role),
    )
    expect(
      unclassified,
      'a new token in tokens.css must be given a contract, a 3:1 duty, or a written reason it has neither',
    ).toEqual([])

    const doubled = COLOR_ROLES.filter(
      (role) =>
        [covered.has(role), nonText.has(role), unmeasured.has(role)].filter(
          Boolean,
        ).length > 1,
    )
    expect(doubled, 'a role may sit in exactly one bucket').toEqual([])
  })

  it('names no role in UNMEASURED_ROLES that tokens.css does not declare', () => {
    const declared = new Set<string>(COLOR_ROLES)
    const stale = Object.keys(UNMEASURED_ROLES).filter(
      (role) => !declared.has(role),
    )
    expect(
      stale,
      'a stale exemption keeps a deleted role alive in the docs',
    ).toEqual([])
  })

  it('gives every exemption a written reason', () => {
    for (const [role, reason] of Object.entries(UNMEASURED_ROLES)) {
      expect(reason.length, `${role} has no reason`).toBeGreaterThan(20)
    }
  })

  it('measures the three saturated action fills that carry a word (KC-IS-#71 item 16)', () => {
    // The session sheet paints "Complete Task", "Start New" and "Break"
    // directly on these. Canon draws them white; measured against this
    // palette white is 3.65 / 1.92 / 2.27 : 1, so the port draws them black —
    // and this is the assertion that keeps that decision honest.
    expect(LABEL_ON_FILL_ROLES.map(({ role }) => role)).toEqual([
      'completeBlue',
      'focusGreen',
      'pastryGreen',
    ])

    const measured = pairs.filter(
      (pair) => pair.contract === 'saturated action fill, black label',
    )
    expect(measured).toHaveLength(LABEL_ON_FILL_ROLES.length * THEMES.length)
    for (const pair of measured) {
      expect(
        ratioBetween(pair.foreground, pair.background),
        `${pair.label} (${pair.theme})`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('covers all 22 semantic chip roles, the way KroTokens.Colors.all does', () => {
    expect(CHIP_ROLES).toHaveLength(Object.keys(SEMANTIC_ROLE_VARS).length)
    expect(CHIP_ROLES).toHaveLength(22)
  })
})

describe('the premise the tokens exist to fix still holds', () => {
  it('the raw system tints the badge palette replaced would fail AA on white', () => {
    // KroApple: white on SwiftUI `.green` measured ~2.2:1 — the finding that
    // produced the badge palette in the first place.
    expect(ratioBetween('#ffffff', '#34c759')).toBeLessThan(AA_TEXT)
    expect(ratioBetween('#ffffff', '#ff9500')).toBeLessThan(AA_TEXT)
  })

  it('plain grey as an outline-chip label sits below AA, which is why chipNeutral exists', () => {
    const back = resolveToken(COLOR_ROLE_VARS.back, 'light')
    expect(ratioBetween('#8e8e93', back)).toBeLessThan(AA_TEXT)
    expect(
      ratioBetween(resolveToken(SEMANTIC_ROLE_VARS.chipNeutral, 'light'), back),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('banner fills are opaque, so their contrast cannot move with the backdrop', () => {
    // A translucent wash measured differently over each of Plan's three
    // backdrops; the opaque token measures the same over all of them.
    for (const theme of ['light', 'dark'] as const) {
      for (const role of ['bannerWarning', 'bannerDanger'] as const) {
        const fill = parseColor(resolveToken(COLOR_ROLE_VARS[role], theme))
        expect(fill.a, `${role} (${theme}) must be fully opaque`).toBe(1)
      }
    }
  })
})
