import { describe, expect, it, vi } from 'vitest'
import {
  GLASS_LIGHT_REST_X,
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
