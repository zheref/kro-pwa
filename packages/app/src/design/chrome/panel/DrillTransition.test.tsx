/** DrillTransition — the shared drill-in motion. */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DrillTransition, drillAnimation } from './DrillTransition'

afterEach(cleanup)

const frame = () => screen.getByText('screen').parentElement as HTMLElement

describe('DrillTransition', () => {
  it('does not animate the first screen', () => {
    render(
      <DrillTransition depth={0} screenKey="detail">
        <p>screen</p>
      </DrillTransition>,
    )
    expect(frame().getAttribute('data-kro-drill')).toBe('none')
    expect(frame().style.animation).toBe('')
  })

  it('slides a deeper screen in from the trailing edge', () => {
    const { rerender } = render(
      <DrillTransition depth={0} screenKey="detail">
        <p>screen</p>
      </DrillTransition>,
    )
    rerender(
      <DrillTransition depth={1} screenKey="edit">
        <p>screen</p>
      </DrillTransition>,
    )
    expect(frame().getAttribute('data-kro-drill')).toBe('push')
    expect(frame().style.animation).toContain('kro-drill-push')
  })

  it('slides a shallower screen in from the leading edge', () => {
    const { rerender } = render(
      <DrillTransition depth={1} screenKey="edit">
        <p>screen</p>
      </DrillTransition>,
    )
    rerender(
      <DrillTransition depth={0} screenKey="detail">
        <p>screen</p>
      </DrillTransition>,
    )
    expect(frame().getAttribute('data-kro-drill')).toBe('pop')
  })

  it('names no animation for no movement', () => {
    expect(drillAnimation(null)).toBeUndefined()
    expect(drillAnimation('pop')?.animation).toContain('kro-drill-pop')
  })

  it('keeps sliding through re-renders at the same depth (the slide was being cut off)', () => {
    const { rerender } = render(
      <DrillTransition depth={0} screenKey="detail">
        <p>screen</p>
      </DrillTransition>,
    )
    rerender(
      <DrillTransition depth={1} screenKey="edit">
        <p>screen</p>
      </DrillTransition>,
    )
    // A slot filling, a Selector settling — the surface renders again while
    // the slide plays. The animation must still be on the element.
    rerender(
      <DrillTransition depth={1} screenKey="edit">
        <p>screen</p>
      </DrillTransition>,
    )
    expect(frame().getAttribute('data-kro-drill')).toBe('push')
    expect(frame().style.animation).toContain('kro-drill-push')
  })

  it('pushes across the full width on the navigation curve', () => {
    expect(drillAnimation('push')?.animation).toBe(
      'kro-drill-push 380ms cubic-bezier(0.32, 0.72, 0, 1) both',
    )
  })
})
