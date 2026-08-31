/**
 * The sheet ↔ popover mapping, and the frames canon measured.
 *
 * The sizes are asserted as literals against canon's own call sites so a
 * "tidy-up" of one number fails here rather than in review:
 *   Inbox 560x620 · Visibility 460x560 · Profile w300 ·
 *   Do notifications 380x440 min · Settings modal 760x620 min ·
 *   Session 360–640.
 */
import { describe, expect, it } from 'vitest'
import { desktopSurface, handheldSurface, tabletSurface } from '../MainMocks'
import {
  PRESENTATION_SIZE,
  PresentationSurface,
  presentationFor,
  presentationStyle,
} from '../MainPresentation'
import { DoSurfaceIdiom, DoSurfaceWidth } from '../DoSurfaceLayout'

describe('canon\'s desktop frames', () => {
  it('keeps the Inbox at 560 x 620', () => {
    expect(PRESENTATION_SIZE.inbox).toEqual({ width: 560, height: 620 })
  })

  it('keeps Visibility at 460 x 560', () => {
    expect(PRESENTATION_SIZE.visibility).toEqual({ width: 460, height: 560 })
  })

  it('keeps Profile at width 300, with no height of its own', () => {
    expect(PRESENTATION_SIZE.profile).toEqual({ width: 300 })
  })

  it('keeps the Do notifications popover at 380 wide, 440 minimum tall', () => {
    expect(PRESENTATION_SIZE.doNotifications).toEqual({
      width: 380,
      minHeight: 440,
    })
  })

  it('keeps the Settings modal at 760 x 620 minimum', () => {
    expect(PRESENTATION_SIZE.settings).toEqual({
      minWidth: 760,
      minHeight: 620,
    })
  })

  it('keeps a session between 360 and 640 wide', () => {
    expect(PRESENTATION_SIZE.session).toEqual({ minWidth: 360, maxWidth: 640 })
  })
})

describe('presentationFor', () => {
  it('sheets everything on a handheld — a popover there is a full-screen sheet anyway', () => {
    for (const surface of Object.values(PresentationSurface)) {
      expect(presentationFor(surface, handheldSurface)).toEqual({
        kind: 'sheet',
        size: null,
      })
    }
  })

  it('anchors a popover on a pointer-driven desktop', () => {
    expect(presentationFor('inbox', desktopSurface)).toEqual({
      kind: 'popover',
      size: PRESENTATION_SIZE.inbox,
    })
  })

  it('anchors a popover on a landscape tablet too — the width is what matters', () => {
    expect(presentationFor('visibility', tabletSurface).kind).toBe('popover')
  })

  it('falls back to a sheet on a tablet narrowed below the breakpoint', () => {
    // Canon's own multitasking case: the idiom has not changed, the width has.
    expect(
      presentationFor('visibility', {
        idiom: DoSurfaceIdiom.tablet,
        width: DoSurfaceWidth.compact,
      }).kind,
    ).toBe('sheet')
  })

  it('keeps Settings a modal on the desktop, never a popover', () => {
    // Canon presents it with `.sheet`, not `.popover`, even on the Mac: it is
    // a hub, not a shortcut.
    expect(presentationFor('settings', desktopSurface)).toEqual({
      kind: 'modal',
      size: PRESENTATION_SIZE.settings,
    })
  })
})

describe('presentationStyle', () => {
  it('emits only the dimensions the surface actually fixes', () => {
    expect(presentationStyle(presentationFor('profile', desktopSurface))).toEqual(
      { width: '300px' },
    )
  })

  it('emits both minimums for the session frame', () => {
    expect(
      presentationStyle({ kind: 'popover', size: PRESENTATION_SIZE.session }),
    ).toEqual({ minWidth: '360px', maxWidth: '640px' })
  })

  it('emits nothing for a sheet, which sizes itself', () => {
    expect(presentationStyle({ kind: 'sheet', size: null })).toEqual({})
  })
})
