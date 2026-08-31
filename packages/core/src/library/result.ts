/**
 * The canonical UZF `Result<T, E>` container (`RC-7`).
 *
 * `Result` is the *only* contract between a Producer and a Reducer: a
 * `createAsyncThunk` payload creator resolves `Promise<Result<Success, …Exception>>`,
 * never throws, and its `.rejected` arm exists purely as a defensive fallback.
 * Every action payload that carries the outcome of an Effect is a `Result`.
 *
 * This module is deliberately dependency-free — it compiles against a bare
 * TypeScript install with no DOM, no Node and no React in scope.
 */

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

/** Wraps a success value. `ok(v)` widens to any `Result<T, E>`. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

/** Wraps a failure value — always a typed `…Exception`, never a raw `Error` (`RC-8`). */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

/** Narrowing guard for the success arm. */
export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok

/** Narrowing guard for the failure arm. */
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => !result.ok
