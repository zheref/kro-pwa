import type { ReactElement } from 'react'
import { dayTimelineStateMocks } from '../DayTimelineMocks'
import { DayTimelineFragment } from './DayTimelineFragment'
import { fragmentPropsFor } from './__tests__/dayTimelineFixtures'

/**
 * `DayTimelineFragment` stories — every scene from `dayTimelineStateMocks`
 * through the real Selectors. Mirrored by
 * `__tests__/DayTimelineFragment.test.tsx`.
 */
export default {
  title: 'DayTimeline/DayTimelineFragment',
  component: DayTimelineFragment,
  decorators: [
    (Story: () => ReactElement) => (
      <div
        style={{
          width: 360,
          background: 'var(--kro-color-back)',
          color: 'var(--kro-color-fore)',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const BusyDay = {
  render: () => (
    <DayTimelineFragment {...fragmentPropsFor(dayTimelineStateMocks.busyDay)} />
  ),
}

export const EmptyDay = {
  render: () => (
    <DayTimelineFragment
      {...fragmentPropsFor(dayTimelineStateMocks.emptyDay)}
    />
  ),
}

export const Failed = {
  render: () => (
    <DayTimelineFragment {...fragmentPropsFor(dayTimelineStateMocks.failed)} />
  ),
}

/** A session previewed at now, with Start. */
export const WithSessionPreview = {
  render: () => (
    <DayTimelineFragment
      {...fragmentPropsFor(dayTimelineStateMocks.emptyDay)}
      sessionPreviewSeconds={20 * 60}
      onStartSession={() => {}}
    />
  ),
}
