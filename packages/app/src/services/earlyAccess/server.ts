/**
 * The early-access **server** barrel — `@kro/app/early-access`.
 *
 * Re-export only. One consumer: `apps/web`'s `app/api/early-access/route.ts`,
 * which reads the environment and binds a sink into the handler. Route
 * handlers are Producers (`RC-43`), the other artifact allowed to hold a
 * Service, which is why the waitlist sink and its `fetch` live here, under
 * `src/services/**` (`RC-3`), and not in the app shell (`RC-62`).
 *
 * A subpath rather than the main barrel, like `@kro/app/google`: the main
 * barrel exports no Service, so a component cannot reach the sink by accident.
 */
export * from './EarlyAccessHandler'
export * from './EarlyAccessSinkService'
