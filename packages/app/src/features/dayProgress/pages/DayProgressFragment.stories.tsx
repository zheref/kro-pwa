import type { ReactElement } from 'react'
import { dayProgressStateMocks as mocks } from '../DayProgressMocks'
import { DayProgressFragment } from './DayProgressFragment'
import { fragmentPropsFor } from './__tests__/dayProgressFixtures'

/**
 * `DayProgressFragment` stories — pure props derived from `DayProgressMocks`
 * through the real Selectors, no `Provider` (`RC-11`). Mirrored 1:1 by
 * `__tests__/DayProgressFragment.test.tsx`.
 */
export default {
  title: 'DayProgress/DayProgressFragment',
  component: DayProgressFragment,
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

export const BusyDay = { args: fragmentPropsFor(mocks.busyDay) }
export const EmptyDay = { args: fragmentPropsFor(mocks.emptyDay) }
export const OnlyTasks = { args: fragmentPropsFor(mocks.onlyTasks) }
export const HabitsAndTasks = { args: fragmentPropsFor(mocks.habitsAndTasks) }
export const LongTitles = { args: fragmentPropsFor(mocks.longTitles) }
export const NonAscii = { args: fragmentPropsFor(mocks.nonAscii) }
export const Loading = { args: fragmentPropsFor(mocks.loading) }
export const Failed = { args: fragmentPropsFor(mocks.failed) }
export const EarlierWeek = { args: fragmentPropsFor(mocks.earlierWeek) }
