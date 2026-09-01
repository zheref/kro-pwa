/**
 * Compile-time exhaustiveness check for discriminated unions (`RC-9`).
 *
 * Call it from the `default` branch of every hand-written `switch` over a
 * `…Exception["kind"]`, a `Result` branch, or any other sealed `kind` union:
 * TypeScript then fails the build the day a new member is added, instead of the
 * code silently falling through at runtime.
 *
 * ```ts
 * switch (exception.kind) {
 *   case 'offline': return 'You are offline.'
 *   // …
 *   default: return assertNever(exception)
 * }
 * ```
 *
 * `createSlice`'s own `reducers` / `extraReducers` maps are exempt — TypeScript's
 * case-key checking on the action map is already the equivalent guarantee, so an
 * unreachable `default` is never bolted onto a reducer arm.
 */
export function assertNever(value: never): never {
  throw new Error(
    `Unhandled discriminated-union case: ${JSON.stringify(value)}`,
  )
}
