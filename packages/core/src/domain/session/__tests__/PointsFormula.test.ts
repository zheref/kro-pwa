import { describe, expect, it } from 'vitest'
import {
  PointsFormula,
  pointsFormulaFromRawValue,
  pointsFormulaLabel,
  pointsFormulas,
} from '../PointsFormula'

describe('PointsFormula', () => {
  it('carries canon’s two cases in declaration order, sliding scale first', () => {
    expect(pointsFormulas).toEqual(['slidingScale', 'legacy'])
  })

  it('keeps the raw values the stored `earn.pointsFormula` setting uses', () => {
    expect(PointsFormula.slidingScale).toBe('slidingScale')
    expect(PointsFormula.legacy).toBe('legacy')
  })
})

describe('reading the stored Earn preference', () => {
  it('honours an explicit legacy choice', () => {
    expect(pointsFormulaFromRawValue('legacy')).toBe(PointsFormula.legacy)
  })

  it('honours an explicit sliding-scale choice', () => {
    expect(pointsFormulaFromRawValue('slidingScale')).toBe(
      PointsFormula.slidingScale,
    )
  })

  it('falls back to the sliding scale on an unrecognized value, never failing the award', () => {
    expect(pointsFormulaFromRawValue('experimental')).toBe(
      PointsFormula.slidingScale,
    )
  })

  it('falls back to the sliding scale when the setting was never written', () => {
    expect(pointsFormulaFromRawValue('')).toBe(PointsFormula.slidingScale)
  })
})

describe('the label shown in Earn preferences', () => {
  it('reads “Sliding scale” for the default', () => {
    expect(pointsFormulaLabel(PointsFormula.slidingScale)).toBe('Sliding scale')
  })

  it('reads “Legacy” for the alternative', () => {
    expect(pointsFormulaLabel(PointsFormula.legacy)).toBe('Legacy')
  })

  it('labels every case, so the picker can never render a blank row', () => {
    for (const formula of pointsFormulas) {
      expect(pointsFormulaLabel(formula).length).toBeGreaterThan(0)
    }
  })
})
