import type { ReactElement } from 'react'
import { StoreProvider } from '../../../library/StoreProvider'
import { DayProgressPage } from './DayProgressPage'
import { makeSeededDayProgressStore } from './__tests__/dayProgressFixtures'

/**
 * `DayProgressPage` stories — a REAL store seeded through the persistence
 * path, so the mount effect's real Producer reads the fixture day. Mirrored by
 * `__tests__/DayProgressPage.test.tsx`. The Fragment stories carry the full
 * state spread; these prove the wiring.
 */
export default {
  title: 'DayProgress/DayProgressPage',
  component: DayProgressPage,
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
    <StoreProvider store={makeSeededDayProgressStore()}>
      <DayProgressPage />
    </StoreProvider>
  ),
}

export const EmptyStore = {
  render: () => (
    <StoreProvider store={makeSeededDayProgressStore([])}>
      <DayProgressPage />
    </StoreProvider>
  ),
}

export const Spanish = {
  render: () => (
    <StoreProvider store={makeSeededDayProgressStore()}>
      <DayProgressPage locale="es-ES" />
    </StoreProvider>
  ),
}
