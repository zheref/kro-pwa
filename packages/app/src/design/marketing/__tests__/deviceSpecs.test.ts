import { describe, expect, it } from 'vitest'
import {
  ANDROID_PHONE,
  IPAD,
  IPHONE,
  MAC_WINDOW,
  WATCH_45MM,
  outerWidth,
  renderedWidth,
} from '../deviceSpecs'

describe('device specs', () => {
  it('draws the iPhone as a 390 x 844 pt screen in an 11 pt bezel', () => {
    expect(IPHONE).toEqual({ screenWidth: 390, screenHeight: 844, bezel: 11 })
    expect(outerWidth(IPHONE)).toBe(412)
  })

  it('draws the Android with a thinner bezel than the iPhone', () => {
    expect(ANDROID_PHONE.bezel).toBeLessThan(IPHONE.bezel)
    expect(outerWidth(ANDROID_PHONE)).toBe(426)
  })

  it('draws the iPad as 820 x 1180 pt and the 45 mm Watch as 198 x 242 pt', () => {
    expect(outerWidth(IPAD)).toBe(856)
    expect(WATCH_45MM.screenWidth / WATCH_45MM.screenHeight).toBeCloseTo(
      198 / 242,
    )
    expect(MAC_WINDOW.contentWidth / MAC_WINDOW.contentHeight).toBeCloseTo(1.6)
  })

  it('scales the whole device, bezel included, and rounds to a pixel', () => {
    expect(renderedWidth(IPHONE, 1)).toBe(412)
    expect(renderedWidth(IPHONE, 0.5)).toBe(206)
    expect(renderedWidth(WATCH_45MM, 0.28)).toBe(64)
  })
})
