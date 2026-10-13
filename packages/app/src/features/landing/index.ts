/**
 * The landing feature's public render tier. The logic tier (slice, Shifters,
 * Selectors, Producers) stays unexported: `apps/web` reaches the page through
 * `LandingPage` and nothing else.
 */
export * from './pages'
