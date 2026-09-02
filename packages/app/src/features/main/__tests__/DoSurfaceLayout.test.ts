/**
 * The decision table, asserted the way canon asserts it: every idiom x width
 * combination, every property, written out as literal expectations rather than
 * recomputed from the implementation. A test that re-derives the rule cannot
 * catch the rule being wrong.
 *
 * The `EXPECTED` table below is transcribed from
 * `KroUI/Do/DoSurfaceLayout.swift` at `zheref/KroApple@2c1ee45`. If a cell here
 * disagrees with that file, this file is what is wrong.
 */
import { describe, expect, it } from 'vitest'
import { TOKENS_CSS } from '../../../design/system/tokens/tokenSource'
import {
  ALL_DO_SURFACE_IDIOMS,
  ALL_DO_SURFACE_WIDTHS,
  DoSurfaceIdiom,
  DoSurfaceWidth,
  POINTER_CONTROL_SIDE,
  POINTER_CONTROL_SPACING,
  REGULAR_WIDTH_BREAKPOINT,
  SSR_DEFAULT_SURFACE,
  TAB_DOCK_INSET,
  TOUCH_CONTROL_SIDE,
  TOUCH_CONTROL_SPACING,
  doSurfaceLayout,
  resolveDoSurface,
  shellShapeFor,
} from '../DoSurfaceLayout'

interface ExpectedRow {
  readonly isTouchPrimary: boolean
  readonly usesExpandedDayTitle: boolean
  readonly extendsHeaderGradientToLeadingEdge: boolean
  readonly showsProfileControl: boolean
  readonly showsInboxControl: boolean
  readonly presentsNotificationsInline: boolean
  readonly minimumControlSide: number
  readonly minimumControlSpacing: number
}

const EXPECTED: Record<string, ExpectedRow> = {
  'handheld/compact': {
    isTouchPrimary: true,
    usesExpandedDayTitle: false,
    extendsHeaderGradientToLeadingEdge: false,
    showsProfileControl: false,
    showsInboxControl: false,
    presentsNotificationsInline: false,
    minimumControlSide: 44,
    minimumControlSpacing: 8,
  },
  'handheld/regular': {
    isTouchPrimary: true,
    usesExpandedDayTitle: false,
    extendsHeaderGradientToLeadingEdge: false,
    showsProfileControl: false,
    showsInboxControl: false,
    presentsNotificationsInline: false,
    minimumControlSide: 44,
    minimumControlSpacing: 8,
  },
  'tablet/compact': {
    isTouchPrimary: true,
    usesExpandedDayTitle: false,
    extendsHeaderGradientToLeadingEdge: false,
    // The ownership rule: a sidebar shell owns Profile and Inbox at ANY width.
    showsProfileControl: true,
    showsInboxControl: true,
    presentsNotificationsInline: false,
    minimumControlSide: 44,
    minimumControlSpacing: 8,
  },
  'tablet/regular': {
    isTouchPrimary: true,
    usesExpandedDayTitle: true,
    extendsHeaderGradientToLeadingEdge: true,
    showsProfileControl: true,
    showsInboxControl: true,
    presentsNotificationsInline: true,
    minimumControlSide: 44,
    minimumControlSpacing: 8,
  },
  'desktop/compact': {
    isTouchPrimary: false,
    usesExpandedDayTitle: true,
    extendsHeaderGradientToLeadingEdge: true,
    showsProfileControl: true,
    showsInboxControl: true,
    presentsNotificationsInline: true,
    minimumControlSide: 28,
    minimumControlSpacing: 4,
  },
  'desktop/regular': {
    isTouchPrimary: false,
    usesExpandedDayTitle: true,
    extendsHeaderGradientToLeadingEdge: true,
    showsProfileControl: true,
    showsInboxControl: true,
    presentsNotificationsInline: true,
    minimumControlSide: 28,
    minimumControlSpacing: 4,
  },
}

describe('doSurfaceLayout — canon KroUI/Do/DoSurfaceLayout.swift', () => {
  for (const idiom of ALL_DO_SURFACE_IDIOMS) {
    for (const width of ALL_DO_SURFACE_WIDTHS) {
      const key = `${idiom}/${width}`

      it(`matches canon's row for ${key}`, () => {
        const layout = doSurfaceLayout({ idiom, width })
        const expected = EXPECTED[key]

        expect(expected).toBeDefined()
        expect({
          isTouchPrimary: layout.isTouchPrimary,
          usesExpandedDayTitle: layout.usesExpandedDayTitle,
          extendsHeaderGradientToLeadingEdge:
            layout.extendsHeaderGradientToLeadingEdge,
          showsProfileControl: layout.showsProfileControl,
          showsInboxControl: layout.showsInboxControl,
          presentsNotificationsInline: layout.presentsNotificationsInline,
          minimumControlSide: layout.minimumControlSide,
          minimumControlSpacing: layout.minimumControlSpacing,
        }).toEqual(expected)
      })
    }
  }

  it('covers every idiom x width combination — no column silently dropped', () => {
    expect(ALL_DO_SURFACE_IDIOMS).toHaveLength(3)
    expect(ALL_DO_SURFACE_WIDTHS).toHaveLength(2)
    expect(Object.keys(EXPECTED)).toHaveLength(6)
  })

  it('keeps Inbox ownership tied to Profile ownership, as canon does', () => {
    for (const idiom of ALL_DO_SURFACE_IDIOMS) {
      for (const width of ALL_DO_SURFACE_WIDTHS) {
        const layout = doSurfaceLayout({ idiom, width })
        expect(layout.showsInboxControl).toBe(layout.showsProfileControl)
      }
    }
  })

  it('never gives a touch surface the pointer control minimums', () => {
    const tabletNarrow = doSurfaceLayout({
      idiom: DoSurfaceIdiom.tablet,
      width: DoSurfaceWidth.compact,
    })
    expect(tabletNarrow.minimumControlSide).toBe(TOUCH_CONTROL_SIDE)
    expect(tabletNarrow.minimumControlSpacing).toBe(TOUCH_CONTROL_SPACING)
    expect(TOUCH_CONTROL_SIDE).toBeGreaterThan(POINTER_CONTROL_SIDE)
    expect(TOUCH_CONTROL_SPACING).toBeGreaterThan(POINTER_CONTROL_SPACING)
  })

  it('agrees with the design system stylesheet about both control floors', () => {
    // Canon reads `KroTokens.Size.minTouchTarget`; the design system carries
    // the same value as a custom property. This module restates them as
    // numbers because it is pure — so the two are asserted equal against the
    // shipped stylesheet here, and a token edit fails this test rather than
    // silently disagreeing with the table.
    expect(TOKENS_CSS).toContain(
      `--kro-size-min-touch-target: ${TOUCH_CONTROL_SIDE}px`,
    )
    expect(TOKENS_CSS).toContain(
      `--kro-size-min-pointer-target: ${POINTER_CONTROL_SIDE}px`,
    )
  })

  it('insets the floating tab dock by the same 8px gutter the shell paints', () => {
    expect(TAB_DOCK_INSET).toBe(TOUCH_CONTROL_SPACING)
    expect(TAB_DOCK_INSET).toBe(8)
  })
})

describe('resolveDoSurface — browser observation to canon inputs', () => {
  it('sends a phone-width touch window to the handheld tab bar', () => {
    const surface = resolveDoSurface({ pointer: 'coarse', viewportWidth: 390 })
    expect(surface).toEqual({ idiom: 'handheld', width: 'compact' })
    expect(shellShapeFor(surface)).toBe('tabBar')
  })

  it('sends a landscape tablet to the sidebar while keeping touch targets', () => {
    const surface = resolveDoSurface({ pointer: 'coarse', viewportWidth: 1024 })
    expect(surface).toEqual({ idiom: 'tablet', width: 'regular' })
    expect(shellShapeFor(surface)).toBe('sidebar')
    expect(doSurfaceLayout(surface).minimumControlSide).toBe(44)
  })

  it('sends a pointer-driven desktop window to the sidebar', () => {
    const surface = resolveDoSurface({ pointer: 'fine', viewportWidth: 1440 })
    expect(surface).toEqual({ idiom: 'desktop', width: 'regular' })
    expect(shellShapeFor(surface)).toBe('sidebar')
    expect(doSurfaceLayout(surface).minimumControlSide).toBe(28)
  })

  it('sends a narrowed desktop window to the tab bar, not to a squeezed sidebar', () => {
    const surface = resolveDoSurface({ pointer: 'fine', viewportWidth: 420 })
    expect(surface).toEqual({ idiom: 'handheld', width: 'compact' })
    expect(shellShapeFor(surface)).toBe('tabBar')
  })

  it('treats the breakpoint itself as regular (boundary)', () => {
    expect(
      resolveDoSurface({
        pointer: 'fine',
        viewportWidth: REGULAR_WIDTH_BREAKPOINT,
      }).width,
    ).toBe('regular')
    expect(
      resolveDoSurface({
        pointer: 'fine',
        viewportWidth: REGULAR_WIDTH_BREAKPOINT - 1,
      }).width,
    ).toBe('compact')
  })

  it('assumes a sidebar-shaped surface before the browser has been measured', () => {
    expect(shellShapeFor(SSR_DEFAULT_SURFACE)).toBe('sidebar')
  })
})
