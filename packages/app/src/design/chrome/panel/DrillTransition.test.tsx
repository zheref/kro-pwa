/** DrillTransition — the shared drill-in motion. */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DRILL_SCENES, DrillScene } from './DrillTransition.stories'
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

/** Mirrors the three scenes of `DrillTransition.stories` (`RC-11`). */
describe('DrillTransition — the stories', () => {
  const body = () => screen.getByTestId('trailing-detail-panel-body')

  it('rest: the top reading shows Close and does not slide', () => {
    render(<DrillScene {...DRILL_SCENES.rest} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(body().getAttribute('data-kro-drill')).toBe('none')
  })

  it('push: drilling into Endeavor Activity shows Back and slides from the trailing edge', () => {
    render(<DrillScene {...DRILL_SCENES.push} />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.getByText('This week')).toBeTruthy()
    expect(body().getAttribute('data-kro-drill')).toBe('push')
  })

  it('pop: going back to Details shows Close and slides from the leading edge', () => {
    render(<DrillScene {...DRILL_SCENES.pop} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(screen.getByText('Kind')).toBeTruthy()
    expect(body().getAttribute('data-kro-drill')).toBe('pop')
  })
})
