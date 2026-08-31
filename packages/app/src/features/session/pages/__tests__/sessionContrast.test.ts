/**
 * The three saturated fills this surface puts a **label** on, measured against
 * `tokens.css` itself.
 *
 * ## Why this file exists at all
 *
 * `contrastContracts.ts` deliberately lists `focusGreen` and `pastryGreen` as
 * *unmeasured*, with the reasons written out: *"session ring stroke; the sheet
 * reads its numbers from text roles"* and *"break-action fill; its label is a
 * chip role"*. Both reasons stopped being true the moment this issue put
 * "Start New" and "Start Focus Session" **on** those fills. `completeBlue` is
 * measured, but only as a non-text role (SC 1.4.11, 3:1) — as an affordance
 * fill *"always paired with an icon and a word"*, not as a background for that
 * word.
 *
 * So this is the missing measurement, taken in the lane that introduced the
 * need. Canon draws all three with `.foregroundStyle(.white)`; measured here
 * that is 3.65 / 1.92 / 2.27 — two of them below even the non-text bar. The
 * sheet therefore diverges and draws them on `absolute`, which under the dark
 * scheme it forces is black. The numbers below are the proof, and they fail the
 * suite rather than a review if a palette change ever breaks them.
 *
 * Adding the matching rows to `contrastContracts.ts` belongs to the design
 * system's lane (`#6`) and is reported as a cross-lane need; this suite is what
 * keeps the claim honest until then.
 */
import { describe, expect, it } from 'vitest'
import {
  AA_TEXT,
  formatRatio,
  ratioBetween,
} from '../../../../design/system/tokens/contrast'
import { resolveToken } from '../../../../design/system/tokens/tokenSource'

/** The sheet forces `colorScheme: .dark`, so the dark values are the ones drawn. */
const dark = (name: string): string => resolveToken(name, 'dark')

const FILLS = [
  ['Complete Task', '--kro-color-complete-blue'],
  ['Start New / play / resume', '--kro-color-focus-green'],
  ['Start Focus Session', '--kro-color-pastry-green'],
] as const

describe('labels on the session sheet’s saturated fills', () => {
  it.each(FILLS)(
    '%s clears the 4.5:1 text bar against the label colour the sheet uses',
    (_label, token) => {
      const ratio = ratioBetween(dark('--kro-color-absolute'), dark(token))
      expect(
        ratio,
        `${formatRatio(ratio)} against ${token}`,
      ).toBeGreaterThanOrEqual(AA_TEXT)
    },
  )

  it.each(FILLS)(
    '%s would FAIL with canon’s white label — the reason for the divergence',
    (_label, token) => {
      // `total` is white under the dark scheme — canon's `.white`.
      expect(ratioBetween(dark('--kro-color-total'), dark(token))).toBeLessThan(
        AA_TEXT,
      )
    },
  )

  it('keeps the pill’s blue checkmark legible on the same fill', () => {
    expect(
      ratioBetween(
        dark('--kro-color-absolute'),
        dark('--kro-color-complete-blue'),
      ),
    ).toBeGreaterThanOrEqual(AA_TEXT)
  })
})
