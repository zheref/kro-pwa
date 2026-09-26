import type { ReactElement } from 'react'
import { StoreProvider } from '../../../library/StoreProvider'
import { planDayFixtures } from '../../plan/PlanMocks'
import { DayTimelinePage } from './DayTimelinePage'
import {
  makeDayTimelineStore,
  makeFailingDayTimelineStore,
} from './__tests__/dayTimelinePageStores'

/**
 * `DayTimelinePage` stories — a REAL store, the real mount dispatch and the
 * real Producer. Mirrored by `__tests__/DayTimelinePage.test.tsx`. The
 * fixture events sit on Plan's reference day, so outside a frozen clock the
 * Typical scene shows today's (likely empty) grid — the Fragment stories carry
 * the populated scenes.
 */
export default {
  title: 'DayTimeline/DayTimelinePage',
  component: DayTimelinePage,
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

export const Typical = {
  render: () => (
    <StoreProvider
      store={makeDayTimelineStore(planDayFixtures.longBlockWithShortOverlaps)}
    >
      <DayTimelinePage />
    </StoreProvider>
  ),
}

export const EmptyStore = {
  render: () => (
    <StoreProvider store={makeDayTimelineStore()}>
      <DayTimelinePage />
    </StoreProvider>
  ),
}

export const Failed = {
  render: () => (
    <StoreProvider store={makeFailingDayTimelineStore('flags unavailable')}>
      <DayTimelinePage />
    </StoreProvider>
  ),
}
