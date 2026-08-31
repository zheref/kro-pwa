import { describe, expect, it } from 'vitest'
import {
  CHROME_LAYOUT,
  FAB_INSETS,
  TOAST_DURATION_SECONDS,
  clampToastDuration,
  pillTrailingPadding,
  toastLiftAbovePill,
} from './chromeLayout'

/**
 * These tests are a TRANSCRIPTION CHECK, not a behaviour check.
 *
 * Every number below is quoted from a named line of KroApple, so the suite's
 * job is to make a silent drift loud: change 62 to 60 here and the failure
 * names the canon site the number came from, which is the one piece of
 * information a reviewer needs to decide whether the change was intended.
 */

describe('the FAB and pill geometry matches MainScreen', () => {
  it('draws the FAB at 62pt — LiquidGlassFAB.size, and the pill height that matches it', () => {
    expect(CHROME_LAYOUT.fabDiameter).toBe(62)
    expect(CHROME_LAYOUT.pillHeight).toBe(CHROME_LAYOUT.fabDiameter)
  })

  it('clears both target floors at that size, so the web port needs no hit-area padding', () => {
    // 44px touch, 28px pointer — the epic's idiom rule. Canon pads by 8pt on
    // top of the disc; this is why the port does not have to.
    expect(CHROME_LAYOUT.fabDiameter).toBeGreaterThanOrEqual(44)
    expect(CHROME_LAYOUT.fabHitAreaInset).toBe(8)
  })

  it('keeps both of canon`s FAB inset variants rather than collapsing them', () => {
    // iOS 26 draws a taller tab bar, so MainScreen genuinely uses two pairs.
    expect(FAB_INSETS.modern).toEqual({ trailing: 12, bottom: 53 })
    expect(FAB_INSETS.legacy).toEqual({ trailing: 16, bottom: 60 })
  })

  it('offsets the pill by the FAB`s own width plus the shared spacing', () => {
    // MainScreen.sessionPillOverlay: fabTrailingPadding + fabDiameter + pillToastSpacing.
    expect(pillTrailingPadding()).toBe(12 + 62 + 15)
    expect(CHROME_LAYOUT.pillBottomPadding).toBe(61)
    expect(CHROME_LAYOUT.pillLeadingPadding).toBe(20)
  })
})

describe('the toast placement constants match ActiveToastModifier', () => {
  it('clears the FAB with 96pt of trailing padding and sits 16pt off the leading edge', () => {
    expect(CHROME_LAYOUT.toastTrailingPadding).toBe(96)
    expect(CHROME_LAYOUT.toastLeadingPadding).toBe(16)
  })

  it('sits 24pt off the bottom and lifts 15pt onto the FAB`s vertical centre', () => {
    expect(CHROME_LAYOUT.toastBottomPadding).toBe(24)
    expect(CHROME_LAYOUT.toastVerticalOffset).toBe(15)
  })

  it('takes the spec`s pill shape, not the Swift view`s capsule — see ActiveToastView', () => {
    expect(CHROME_LAYOUT.toastCornerRadius).toBe(16)
    expect(CHROME_LAYOUT.toastMinHeight).toBe(72)
    expect(CHROME_LAYOUT.toastMaxWidth).toBe(360)
  })
})

describe('the lift-above-pill rule', () => {
  it('raises the toast fully clear of the pill — the whole point of the rule', () => {
    // A user starts a session, then completes a task: the toast must not land
    // on top of the running-session pill.
    const lift = toastLiftAbovePill()
    const pillTop = CHROME_LAYOUT.pillBottomPadding + CHROME_LAYOUT.pillHeight
    const toastBottom = CHROME_LAYOUT.toastBottomPadding + lift

    expect(toastBottom).toBeGreaterThan(pillTop)
  })

  it('leaves exactly the canon gap between the two — pillToastSpacing', () => {
    const pillTop = CHROME_LAYOUT.pillBottomPadding + CHROME_LAYOUT.pillHeight
    const toastBottom = CHROME_LAYOUT.toastBottomPadding + toastLiftAbovePill()

    expect(toastBottom - pillTop).toBe(CHROME_LAYOUT.pillToastSpacing)
  })

  it('equals MainScreen.toastLiftAbovePill`s own arithmetic', () => {
    expect(toastLiftAbovePill()).toBe(61 + 62 + 15 - 24)
  })
})

describe('auto-dismiss duration is clamped into the documented reading window', () => {
  it('leaves a normal 8-second undo toast alone', () => {
    expect(clampToastDuration(8)).toBe(8)
  })

  it('raises a flash-past toast to the 3-second reading minimum', () => {
    // ActiveToast.md § Accessibility: "minimum 3 seconds for short messages".
    expect(clampToastDuration(0.5)).toBe(TOAST_DURATION_SECONDS.min)
  })

  it('caps a toast that would sit on screen for a minute', () => {
    expect(clampToastDuration(60)).toBe(TOAST_DURATION_SECONDS.max)
  })

  it('falls back to canon`s default when a caller hands over a broken number', () => {
    // A duration computed from an empty list arrives as NaN; a toast that never
    // dismisses is worse than one that dismisses at the default.
    expect(clampToastDuration(Number.NaN)).toBe(TOAST_DURATION_SECONDS.default)
    expect(TOAST_DURATION_SECONDS.default).toBe(10)
  })
})
