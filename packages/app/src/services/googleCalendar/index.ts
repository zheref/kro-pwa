/**
 * The Google Calendar integration barrel (KC-IS-#33).
 *
 * Re-export only. Two consumers, and no third:
 *
 * 1. **`library/store.ts`** — assembles `ThunkExtra` from the live/stubbed
 *    bindings and builds the `PlanHost` adapter. This is the sanctioned
 *    Service import site (`RC-6`, `RC-21`); `check-uzf-boundaries.mjs` refuses
 *    every other one inside `packages/app`.
 * 2. **`apps/web`'s `app/api/google/**` route handlers**, via the `@kro/app/google`
 *    subpath export. Route handlers are Producers (`RC-43`), which is the other
 *    artifact allowed to hold a Service — and they are the *only* place a
 *    Google token exists at all.
 *
 * The subpath exists rather than folding these into `@kro/app`'s main barrel
 * precisely so a component cannot reach them by accident: the main barrel
 * exports no Service, and this one is named for what it is.
 */
export * from './GoogleCalendarApiService'
export * from './GoogleCalendarConnection'
export * from './GoogleCalendarCookies'
export * from './GoogleCalendarEnvironment'
export * from './GoogleCalendarException'
export * from './GoogleCalendarMapper'
export * from './GoogleCalendarPlanHost'
export * from './GoogleCalendarResponse'
export * from './GoogleCalendarRouteHandlers'
export * from './GoogleCalendarRouteResponse'
export * from './GoogleCalendarServer'
export * from './GoogleCalendarService'
export * from './GoogleCalendarSessionEvent'
export * from './GoogleOAuthService'
export * from './GoogleTokenVault'
