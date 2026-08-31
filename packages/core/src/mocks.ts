/**
 * `@kro/core/mocks` — domain-model mock fixtures (`RC-13`).
 *
 * Kept off the main `@kro/core` barrel deliberately: mocks are test/story data,
 * so importing them must be an explicit, greppable act (`@kro/core/mocks`) that
 * never rides along into a production bundle.
 */

export * from './models/__mocks__/Greeting.mocks'
