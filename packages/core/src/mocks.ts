/**
 * `@kro/core/mocks` — domain-model mock fixtures (`RC-13`).
 *
 * Kept off the main `@kro/core` barrel deliberately: mocks are test/story data,
 * so importing them must be an explicit, greppable act (`@kro/core/mocks`) that
 * never rides along into a production bundle.
 */

export * from './domain/endeavor/__mocks__/Endeavor.mocks'
export * from './domain/endeavor/__mocks__/EndeavorRelations.mocks'
export * from './domain/session/__mocks__/FocusSessionConfig.mocks'
export * from './domain/session/__mocks__/FocusSessionFragment.mocks'
export * from './domain/session/__mocks__/PersistedRunningSession.mocks'
export * from './domain/session/__mocks__/SessionLaunchRecommendation.mocks'
export * from './domain/session/__mocks__/SessionSummary.mocks'
export * from './domain/reconciliation/__mocks__/Reconciliation.mocks'
export * from './domain/shared/__mocks__/EndeavorList.mocks'
export * from './domain/shared/__mocks__/Reward.mocks'
export * from './domain/shared/__mocks__/User.mocks'
export * from './models/__mocks__/Greeting.mocks'
export * from './vistas/__mocks__/EndeavorsLens.mocks'
export * from './vistas/__mocks__/EndeavorsQuery.mocks'
export * from './vistas/__mocks__/EndeavorsVista.mocks'
