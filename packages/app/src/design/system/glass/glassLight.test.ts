import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GLASS_LIGHT_REST_X,
  GLASS_LIT_CLASS,
  approachGlassBar,
  glassBarOffset,
  pointerInsideGlass,
  GLASS_LIGHT_REST_Y,
  approachGlassLight,
  glassLightOffset,
  startGlassLight,
} from './glassLight'

const PIECE = { left: 100, top: 100, width: 200, height: 100 }

describe('glassLightOffset', () => {
  it('rests at the upper-left light when the pointer is on the piece', () => {
    expect(glassLightOffset(200, 150, PIECE)).toEqual({
      x: GLASS_LIGHT_REST_X,
      y: GLASS_LIGHT_REST_Y,
    })
  })

  it('lights the top edge when the pointer is above the piece', () => {
    const light = glassLightOffset(200, 0, PIECE)

    expect(light.y).toBeGreaterThan(0.9)
    expect(Math.abs(light.x)).toBeLessThan(0.1)
  })

  it('lights the left edge when the pointer is to the left', () => {
    const light = glassLightOffset(0, 150, PIECE)

    expect(light.x).toBeGreaterThan(0.9)
    expect(Math.abs(light.y)).toBeLessThan(0.1)
  })

  it('lights the corner that faces the pointer', () => {
    const light = glassLightOffset(0, 0, PIECE)

    expect(light.x).toBeGreaterThan(0)
    expect(light.y).toBeGreaterThan(0)
  })
})

describe('approachGlassLight', () => {
  it('takes a step toward the pointer and does not arrive in that step', () => {
    const next = approachGlassLight(
      { x: GLASS_LIGHT_REST_X, y: GLASS_LIGHT_REST_Y },
      { x: 1, y: 0 },
    )

    expect(next.x).toBeGreaterThan(GLASS_LIGHT_REST_X)
    expect(next.x).toBeLessThan(1)
    expect(next.y).toBeLessThan(GLASS_LIGHT_REST_Y)
    expect(next.y).toBeGreaterThan(0)
  })
})

describe('startGlassLight', () => {
  it('writes the offsets onto each glass piece from the pointer', () => {
    const stop = startGlassLight(document)
    const piece = document.createElement('div')
    piece.className = 'kro-glass'
    document.body.append(piece)
    vi.spyOn(piece, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
      right: 300,
      bottom: 200,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    })

    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 200, clientY: 0 }),
    )

    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        const y = Number.parseFloat(
          piece.style.getPropertyValue('--kro-glass-light-y'),
        )
        expect(y).toBeGreaterThan(GLASS_LIGHT_REST_Y)
        expect(y).toBeLessThan(1)
        stop()
        resolve()
      })
    })
  })
})

const rectOf = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  x: left,
  y: top,
  toJSON: () => ({}),
})

function mountPiece(className: string, rect = rectOf(100, 100, 200, 100)) {
  const piece = document.createElement('div')
  piece.className = className
  document.body.append(piece)
  vi.spyOn(piece, 'getBoundingClientRect').mockReturnValue(rect)
  return piece
}

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

describe('pointerInsideGlass', () => {
  it('is inside at the centre and on the edge of the box', () => {
    expect(pointerInsideGlass(200, 150, PIECE)).toBe(true)
    expect(pointerInsideGlass(100, 100, PIECE)).toBe(true)
    expect(pointerInsideGlass(300, 200, PIECE)).toBe(true)
  })

  it('is outside one pixel past any edge', () => {
    expect(pointerInsideGlass(99, 150, PIECE)).toBe(false)
    expect(pointerInsideGlass(301, 150, PIECE)).toBe(false)
    expect(pointerInsideGlass(200, 99, PIECE)).toBe(false)
    expect(pointerInsideGlass(200, 201, PIECE)).toBe(false)
  })

  it('is never inside before the pointer has been seen (NaN)', () => {
    expect(pointerInsideGlass(Number.NaN, Number.NaN, PIECE)).toBe(false)
  })
})

describe('glassBarOffset', () => {
  const BAR = { left: 0, top: 0, width: 1000, height: 48 }

  it('follows the pointer along the bar', () => {
    expect(glassBarOffset(640, BAR)).toBe(640)
  })

  it('clamps to the bar when the pointer is past either end', () => {
    expect(glassBarOffset(-50, BAR)).toBe(0)
    expect(glassBarOffset(1400, BAR)).toBe(1000)
  })

  it('ignores the pointer height — the bar has one lit edge', () => {
    expect(glassBarOffset(300, BAR)).toBe(glassBarOffset(300, BAR))
    expect(approachGlassBar(300, 600)).toBeGreaterThan(300)
    expect(approachGlassBar(300, 600)).toBeLessThan(600)
  })
})

describe('startGlassLight — lit and tracked', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('lights a piece the pointer is inside and leaves its rim untouched', async () => {
    const stop = startGlassLight(document)
    const piece = mountPiece('kro-glass')

    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 150, clientY: 120 }),
    )
    await nextFrame()

    expect(piece.classList.contains(GLASS_LIT_CLASS)).toBe(true)
    expect(piece.style.getPropertyValue('--kro-glass-light-x')).toBe('')
    stop()
  })

  it('tracks a piece the pointer is outside of and keeps it unlit', async () => {
    const stop = startGlassLight(document)
    const piece = mountPiece('kro-glass')

    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 200, clientY: 0 }),
    )
    await nextFrame()

    expect(piece.classList.contains(GLASS_LIT_CLASS)).toBe(false)
    expect(piece.style.getPropertyValue('--kro-glass-light-y')).not.toBe('')
    stop()
  })

  it('unlights the piece once the pointer moves out of its box', async () => {
    const stop = startGlassLight(document)
    const piece = mountPiece('kro-glass')

    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 150, clientY: 120 }),
    )
    await nextFrame()
    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 600, clientY: 600 }),
    )
    await nextFrame()

    expect(piece.classList.contains(GLASS_LIT_CLASS)).toBe(false)
    stop()
  })

  it('unlights a piece carried out from under a resting pointer by a scroll', async () => {
    const stop = startGlassLight(document)
    const piece = mountPiece('kro-glass')

    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 150, clientY: 120 }),
    )
    await nextFrame()
    expect(piece.classList.contains(GLASS_LIT_CLASS)).toBe(true)

    // The page scrolled 700px: the piece is now above the viewport, the
    // pointer has not moved.
    vi.spyOn(piece, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: -600,
      width: 200,
      height: 80,
      top: -600,
      right: 300,
      bottom: -520,
      left: 100,
      toJSON: () => ({}),
    } as DOMRect)
    document.dispatchEvent(new Event('scroll'))
    await nextFrame()

    expect(piece.classList.contains(GLASS_LIT_CLASS)).toBe(false)
    stop()
  })

  it('re-runs the lit test on resize, and schedules nothing before a pointer was seen', async () => {
    const stop = startGlassLight(document)
    const piece = mountPiece('kro-glass')
    const raf = vi.spyOn(window, 'requestAnimationFrame')

    window.dispatchEvent(new Event('resize'))
    // `schedule` requests its frame synchronously; nothing to re-run yet.
    expect(raf).not.toHaveBeenCalled()
    expect(piece.classList.contains(GLASS_LIT_CLASS)).toBe(false)

    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 150, clientY: 120 }),
    )
    await nextFrame()
    expect(piece.classList.contains(GLASS_LIT_CLASS)).toBe(true)
    const before = raf.mock.calls.length
    window.dispatchEvent(new Event('resize'))
    expect(raf.mock.calls.length).toBe(before + 1)
    await nextFrame()
    stop()
  })

  it('unlights every piece when the pointer leaves the window', async () => {
    const stop = startGlassLight(document)
    const piece = mountPiece('kro-glass')

    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 150, clientY: 120 }),
    )
    await nextFrame()
    document.documentElement.dispatchEvent(new Event('pointerleave'))
    await nextFrame()

    expect(piece.classList.contains(GLASS_LIT_CLASS)).toBe(false)
    stop()
  })

  it('moves a bar hotspot to the pointer x instead of aiming a rim', async () => {
    const stop = startGlassLight(document)
    const bar = mountPiece('kro-glass kro-glass--bar', rectOf(0, 0, 1000, 48))

    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 900, clientY: 400 }),
    )
    await nextFrame()

    const x = Number.parseFloat(bar.style.getPropertyValue('--kro-glass-bar-x'))
    expect(x).toBeGreaterThan(300)
    expect(x).toBeLessThan(900)
    expect(bar.style.getPropertyValue('--kro-glass-light-x')).toBe('')
    expect(bar.classList.contains(GLASS_LIT_CLASS)).toBe(false)
    stop()
  })

  it('lights the bar when the pointer is inside it', async () => {
    const stop = startGlassLight(document)
    const bar = mountPiece('kro-glass kro-glass--bar', rectOf(0, 0, 1000, 48))

    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 500, clientY: 20 }),
    )
    await nextFrame()

    expect(bar.classList.contains(GLASS_LIT_CLASS)).toBe(true)
    stop()
  })

  it('ignores touch pointers entirely', async () => {
    const stop = startGlassLight(document)
    const piece = mountPiece('kro-glass')
    const touch = new MouseEvent('pointermove', { clientX: 150, clientY: 120 })
    Object.defineProperty(touch, 'pointerType', { value: 'touch' })

    document.dispatchEvent(touch)
    await nextFrame()

    expect(piece.classList.contains(GLASS_LIT_CLASS)).toBe(false)
    stop()
  })
})

describe('startGlassLight — reduced motion', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('still lights a piece under the pointer but never tracks a rim', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList)
    const stop = startGlassLight(document)
    const inside = mountPiece('kro-glass')
    const outside = mountPiece('kro-glass', rectOf(600, 600, 100, 50))

    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 150, clientY: 120 }),
    )
    await nextFrame()

    expect(inside.classList.contains(GLASS_LIT_CLASS)).toBe(true)
    expect(outside.style.getPropertyValue('--kro-glass-light-x')).toBe('')
    stop()
  })
})
