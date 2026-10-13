/**
 * Test support: a store on the stubbed extra whose analytics and sign-up
 * Services are the recording doubles, so a test can assert on what was sent.
 * The doubles come straight from their Service modules — allowed for a test,
 * and the reason `store.ts` no longer re-exports them (`RC-6`).
 */
import {
  type RecordingAnalyticsService,
  makeRecordingAnalyticsService,
} from '../../../services/analytics/AnalyticsService'
import {
  type RecordingEarlyAccessService,
  makeRecordingEarlyAccessService,
} from '../../../services/earlyAccess/EarlyAccessService'
import { makeEarlyAccessStore } from '../EarlyAccessMocks'

export interface RecordedServices {
  readonly analytics: RecordingAnalyticsService
  readonly earlyAccess: RecordingEarlyAccessService
}

export const makeRecordedStore = () => {
  const services: RecordedServices = {
    analytics: makeRecordingAnalyticsService(),
    earlyAccess: makeRecordingEarlyAccessService(),
  }
  const { store } = makeEarlyAccessStore({
    analyticsService: services.analytics,
    earlyAccessService: services.earlyAccess,
  })
  return { store, services }
}
