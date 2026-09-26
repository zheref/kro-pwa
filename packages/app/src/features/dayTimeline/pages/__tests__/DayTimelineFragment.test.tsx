/**
 * `DayTimelineFragment` render tests mirroring its stories (`RC-11`).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayTimelineStateMocks } from '../../DayTimelineMocks'
import { DayTimelineFragment } from '../DayTimelineFragment'
import { fragmentPropsFor } from './dayTimelineFixtures'

afterEach(cleanup)

describe('DayTimelineFragment', () => {
  it('BusyDay: a read-only canvas with every card and the now line', () => {
    render(
      <DayTimelineFragment
        {...fragmentPropsFor(dayTimelineStateMocks.busyDay)}
      />,
    )
    expect(screen.getAllByTestId('plan-timeline-block')).toHaveLength(3)
    expect(screen.getByTestId('plan-timeline').dataset.readOnly).toBe('true')
    expect(screen.getByTestId('plan-timeline-now')).toBeTruthy()
    expect(screen.queryByTestId('plan-timeline-slots')).toBeNull()
  })

  it('EmptyDay: canon keeps the bare grid, no empty-state copy', () => {
    render(
      <DayTimelineFragment
        {...fragmentPropsFor(dayTimelineStateMocks.emptyDay)}
      />,
    )
    expect(screen.getByTestId('plan-timeline-grid')).toBeTruthy()
    expect(screen.queryAllByTestId('plan-timeline-block')).toHaveLength(0)
  })

  it('Failed: one line from the domain tier above the grid', () => {
    render(
      <DayTimelineFragment
        {...fragmentPropsFor(dayTimelineStateMocks.failed)}
      />,
    )
    expect(screen.getByTestId('day-timeline-failure').textContent).toBe(
      "Couldn't load today's timeline.",
    )
    expect(screen.getByTestId('plan-timeline-grid')).toBeTruthy()
  })

  it('WithSessionPreview: previews a session started now, and Start opens setup', async () => {
    const onStartSession = vi.fn()
    render(
      <DayTimelineFragment
        {...fragmentPropsFor(dayTimelineStateMocks.emptyDay)}
        sessionPreviewSeconds={20 * 60}
        onStartSession={onStartSession}
      />,
    )
    expect(
      screen
        .getByTestId('plan-timeline-session-preview')
        .getAttribute('aria-label'),
    ).toContain('New Session')
    await userEvent.click(
      screen.getByTestId('plan-timeline-session-preview-start'),
    )
    expect(onStartSession).toHaveBeenCalledOnce()
  })

  it('previews nothing without a way to start it', () => {
    render(
      <DayTimelineFragment
        {...fragmentPropsFor(dayTimelineStateMocks.emptyDay)}
        sessionPreviewSeconds={20 * 60}
      />,
    )
    expect(screen.queryByTestId('plan-timeline-session-preview')).toBeNull()
  })

  it('opens on now: the now line is scrolled to, just below the top', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      render(
        <DayTimelineFragment
          {...fragmentPropsFor(dayTimelineStateMocks.busyDay)}
        />,
      )
      expect(scrollIntoView).toHaveBeenCalledOnce()
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
      expect(
        screen.getByTestId('plan-timeline-now').style.scrollMarginTop,
      ).toBe('64px')
    } finally {
      // biome-ignore lint/performance/noDelete: restore jsdom, which has no scrollIntoView
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
    }
  })

  it('renders nothing before the pane has stamped a clock', () => {
    const { container } = render(
      <DayTimelineFragment {...fragmentPropsFor(dayTimelineStateMocks.idle)} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
