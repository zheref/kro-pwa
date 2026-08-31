<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/04-producers-effects.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 04 — Producers, Effects & Tasks

## Repo-specific placeholders

- `packages/core` — the shared package holding the RTK state-logic tier (slices, selectors,
  shifters, producers, services, mappers) consumed by both apps/web and apps/mobile (absent, this repo is web-only). The
  feature sample names below (`UserProfile…`, `ProfileService`, `SearchTask`) are illustrative — this
  stack has no live reference product yet.
- `apps/web` — the Next.js App Router app dir.
- `apps/mobile (absent, this repo is web-only)` — the Expo Router (React Native) app dir.

Implements `UZF-12` (reducers pure, no inline effects), `UZF-13` (no service/persistence/clock
calls from a reducer), `UZF-14` (effects resolve a `Result`, never throw), `UZF-15` (Producers are
state-free factories), `UZF-3` (one completion event carries a `Result`), and `UZF-16` (external
systems sit behind DI'd Services); bound to React + Redux Toolkit by `RC-3`, `RC-25`, `RC-26`,
`RC-27`, and `RC-16` below.

## What a Producer is (`RC-3` implements `UZF-15`)

A Producer is a module named `<Feature>Producer.ts`, co-located with the feature's slice,
selectors, and shifters (`UZF-6`). It exports `createAsyncThunk(...)` factories — never a class,
never a hook. A Producer holds **zero mutable state**: it depends only on the Services injected
through the thunk's `extra` argument (`UZF-16`), never on the whole Redux `state` via `getState()`
unless a specific, narrow slice of state is genuinely required as an input. It performs **no I/O at
module-evaluation time** — every export is a factory whose payload creator runs only when
dispatched.

```ts
// packages/core/features/userProfile/UserProfileProducer.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Result } from "../../library/result";
import { err, ok } from "../../library/result";
import type { ThunkExtra } from "../../library/store";
import type { Profile } from "../../models/Profile";
import { ProfileExceptions, type ProfileException } from "../../models/ProfileException";
import { ProfileMapper } from "../../models/ProfileMapper";

/**
 * Producer-built async thunk. Resolves `Result<Profile, ProfileException>` in
 * its payload — it never rejects, so reducers handle outcomes uniformly (UZF-3, UZF-14).
 */
export const fetchProfileThunk = createAsyncThunk<
    Result<Profile, ProfileException>,
    { profileId: string },
    { extra: ThunkExtra }
>("userProfile/onProfileFetchCompleted", async ({ profileId }, { extra, signal }) => {
    try {
        const response = await extra.profileService.fetchProfile(profileId, { signal });
        const profile = ProfileMapper.toDomain(response);
        return profile
            ? ok(profile)
            : err(ProfileExceptions.unknown("Malformed profile payload"));
    } catch (error) {
        return err(ProfileMapper.toException(error));
    }
});
```

Reducers never build this inline — a Page/Fragment dispatches the exported thunk directly
(`dispatch(fetchProfileThunk({ profileId }))`); the `extraReducers` builder in the slice is the only
place that reacts to its lifecycle (`RC-26`, `UZF-12`).

### Producer rules

1. **`createAsyncThunk`-built, state-free.** A Producer's payload creator receives only the
   arguments the effect needs (the thunk's first generic) plus `extra` (Services) via `thunkAPI` —
   never the whole `RootState` (`UZF-15`). Reach for `getState()` only for a narrow, named read the
   effect genuinely needs (e.g. an auth token), never as a substitute for passing arguments in.
2. **Every payload creator resolves a `Result<T, E>`.** Success and failure unify into one
   resolved value — `ok(value)` or `err(exception)` — never a thrown error and never separate
   `onSuccess`/`onFailure` events (`UZF-3`, `UZF-14`).
3. **Failures are caught inside the payload creator, never thrown out of it.** Wrap the Service
   call in `try/catch`; translate the caught error to a typed `<Feature>Exception` via the
   imported `<Feature>Mapper`'s `toException` — never a Producer-local mapping function, which
   is the one canonical home for that translation (`07`'s Mapper contract) — then `return
   err(...)`. The `.rejected` lifecycle arm is a defensive fallback only, not the primary failure
   path (`RC-26`, `UZF-14`).
4. **Cancellation is the only silent exit.** `createAsyncThunk` exposes `signal: AbortSignal` on
   the payload creator's `thunkAPI` — pass it straight into the Service call (`fetch(url, { signal
   })`, or an equivalent option on a hand-rolled Service) so an aborted dispatch resolves via
   cancellation, not a caught error surfaced as an Exception. When the standard form isn't enough
   (fine-grained progress, a caller-held cancel handle), use a `…Task` (`RC-27`).
5. **No boundary access inside a Producer.** A Producer never calls `fetch`, a browser storage API,
   or a native module directly — those go through a `…Service` interface injected via `extra`
   (`UZF-13`, `UZF-16`). Navigation is the same shape: treat the router as a Service and call
   `extra.router.navigate(...)` (or an injected navigation Service) from inside the payload
   creator, never from the component.
6. **Test the thunk directly** by dispatching it against a store built with a stubbed Service in
   `extra`, and asserting on the resulting state (mirrors `UZF-18`; see the `UserProfileFeature.test.ts`
   pattern in the stack's testing rule).

## Effect — the promise a Producer returns (`RC-25` implements `UZF-14`)

- The "Effect" in this stack **is** the promise `createAsyncThunk` builds. Dispatching the thunk
  action returns that promise, which RTK also stamps with an `.abort(reason?)` method — the
  built-in cancellation handle for the standard form.
- A Producer never constructs `.pending` / `.fulfilled` / `.rejected` actions by hand — `createAsyncThunk`
  generates all three from the `"feature/onSomethingCompleted"` type string passed as its first
  argument. Reducers consume them only through the slice's `extraReducers` builder (`.addCase(...)`),
  never by matching on raw action-type strings.
- Both the standard `createAsyncThunk` form and the hand-rolled `…Task` form (`RC-27`) end the same
  way: a plain action dispatched back into the same `reducers`/`extraReducers` surface. Neither form
  ever sets state directly from inside the Producer.

### `.pending` / `.fulfilled` / `.rejected` handling (`RC-26` implements `UZF-3`, `UZF-12`)

`createAsyncThunk` auto-generates three action creators from the thunk's type string
(`userProfile/onProfileFetchCompleted.pending`, `.fulfilled`, `.rejected`) — the lifecycle suffix
`UZF-2` reserves for effect resolution. The slice's `extraReducers` handles all three:

```ts
// packages/core/features/userProfile/UserProfileFeature.ts (extraReducers excerpt)

builder
    .addCase(fetchProfileThunk.pending, (state) => {
        Object.assign(state, withLoadingStarted(state));
    })
    .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        const result = action.payload; // Result<Profile, ProfileException>
        if (result.ok) {
            Object.assign(state, withProfileLoaded(state, result.value));
        } else {
            Object.assign(state, withException(state, result.error));
        }
    })
    // Defensive only — the payload creator's try/catch means this should not fire in practice.
    .addCase(fetchProfileThunk.rejected, (state, action) => {
        Object.assign(state, withException(
            state,
            { kind: "unknown", message: action.error.message ?? "Unknown error", recoverable: true },
        ));
    });
```

- **`.pending`** shifts state to a loading shape via a Shifter — the same shape a `userDidPullToRefresh`
  reducer arm uses (`UZF-10`).
- **`.fulfilled`** always carries a `Result`, never a bare success value — the reducer branches on
  `result.ok` and calls the matching Shifter on each arm. A `.fulfilled` handler that assumes success
  without checking `result.ok` is a `UZF-3` violation.
- **`.rejected`** exists **only** as a defensive fallback for genuinely unexpected failures (a
  serialization error, a bug in the payload creator's own try/catch, `RTK`'s own `dispatch` throwing).
  It is not where day-to-day Service failures are handled — those flow through `.fulfilled`'s
  `err(...)` branch. A `.rejected` arm that fires routinely in practice is a signal the payload
  creator's `try/catch` is incomplete, not a acceptable steady-state path.
- Reducers never inspect `action.error` outside the `.rejected` arm, and never re-derive a `Result`
  from `action.meta` — the `Result` contract lives exclusively in the `.fulfilled` payload.

## Task — the `AbortController` wrapper (`RC-27` implements `UZF-14`)

Prefer `createAsyncThunk` (`RC-3`, `RC-25`, `RC-26`) for the default "one request, one completion event"
shape. Reach for a hand-rolled thunk plus a **`…Task`** wrapper only when the standard form can't
express what's needed: fine-grained progress reporting mid-flight, or a caller that needs an
explicit cancel handle living outside the dispatch call itself (e.g. stored in a ref and aborted on
unmount, or superseded by a newer user action).

A `…Task` is a small object pairing a `Promise` with an `abort` function backed by an
`AbortController` — the UZF "Task" role, realized in this stack as a plain wrapper rather than a
class:

```ts
// packages/core/features/search/SearchProducer.ts

export interface SearchTask {
    readonly abort: (reason?: string) => void;
}

/**
 * Hand-rolled Producer method for a case createAsyncThunk can't express cleanly:
 * the caller holds the cancel handle (e.g. a debounced search box) and progress
 * is reported as it happens rather than as one terminal event.
 */
export function startSearchTask(
    dispatch: AppDispatch,
    extra: ThunkExtra,
    query: string,
): SearchTask {
    const controller = new AbortController();

    void (async () => {
        try {
            const response = await extra.searchService.search(query, { signal: controller.signal });
            dispatch(onSearchCompleted(ok(SearchMapper.toDomain(response))));
        } catch (error) {
            if (controller.signal.aborted) return; // cancellation is the only silent exit (UZF-14)
            dispatch(onSearchCompleted(err(SearchMapper.toException(error))));
        }
    })();

    return { abort: (reason) => controller.abort(reason) };
}
```

The calling Page/Fragment stores the returned `SearchTask` (typically in a `useRef`) and calls
`.abort(...)` when a newer keystroke supersedes the in-flight request, or on unmount — the same
"cancellation is the only silent exit" contract `createAsyncThunk`'s built-in `signal` gives for
free (`RC-3` rule 4). A `…Task` still dispatches exactly one completion event on the non-aborted
path (`UZF-3`); it never resolves a promise the reducer awaits directly.

### `createAsyncThunk` vs a hand-rolled `…Task`

| Situation | Form |
| --- | --- |
| Single request → single completion event, cancellation only needs to follow the dispatch's own lifetime | `createAsyncThunk`, passing `thunkAPI.signal` into the Service call |
| Debounced search / type-ahead where a newer request should cancel the previous one, and the cancel decision is made by the caller (not by RTK's own dedup) | Hand-rolled thunk + `…Task`, so the Page/Fragment can hold and call `.abort()` explicitly |
| Fine-grained progress reporting mid-flight (e.g. upload percentage) | Hand-rolled thunk + `…Task` — dispatch intermediate progress events from inside the async body |
| Multiple sequential Service calls with branching, no caller-held cancel handle needed | `createAsyncThunk` is still preferred — branch inside the payload creator's `try/catch` |
| Network-cache-driven read (list/detail, polling, cache invalidation) | Neither — use RTK Query as Service-tier, wrapped by a Producer thunk (`RC-16`) |

If in doubt, default to `createAsyncThunk`. Switch to a hand-rolled `…Task` only when a caller
genuinely needs the cancel handle or intermediate progress events.

## RTK Query as Service-tier (`RC-16` implements `UZF-16`)

UZF treats RTK Query endpoints as **Service**-tier, not as a replacement for the Producer/Reducer
loop. An `createApi(...)` definition lives in `services/`, alongside hand-rolled Services — it is
the network-cache-driven equivalent of a `live…Service`:

```ts
// packages/core/services/network/profileApi.ts  (Service-tier)

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query";
import type { ProfileResponse } from "../../models/ProfileResponse";

export const profileApi = createApi({
    reducerPath: "profileApi",
    baseQuery: fetchBaseQuery({ baseUrl: "https://api.example.com" }),
    endpoints: (builder) => ({
        fetchProfile: builder.query<ProfileResponse, string>({
            query: (id) => `profiles/${id}`,
        }),
    }),
});
```

```ts
// packages/core/features/userProfile/UserProfileProducer.ts

export const fetchProfileThunk = createAsyncThunk<
    Result<Profile, ProfileException>,
    { profileId: string },
    { extra: ThunkExtra }
>("userProfile/onProfileFetchCompleted", async ({ profileId }, { dispatch }) => {
    try {
        const response = await dispatch(
            profileApi.endpoints.fetchProfile.initiate(profileId),
        ).unwrap();
        const profile = ProfileMapper.toDomain(response);
        return profile ? ok(profile) : err(ProfileExceptions.unknown("Malformed profile payload"));
    } catch (error) {
        return err(ProfileMapper.toException(error));
    }
});
```

- **RTK Query's auto-generated hooks (`useFetchProfileQuery`, `useUpdateDisplayNameMutation`, …) are
  forbidden inside Pages and Fragments.** They bypass the Producer/Reducer loop the same way a raw
  `fetch` in a component would (`UZF-12`, `UZF-13`). Expose a Producer thunk that delegates to the
  endpoint's `.initiate(...)` instead, exactly as any other Service call.
- `profileApi.reducer` is registered in `library/store.ts` alongside the feature slices, and
  `profileApi.middleware` is added to `configureStore`'s middleware chain — this is infrastructure
  wiring, not a Producer concern.
- Cache invalidation (`providesTags`/`invalidatesTags`) is configured on the `createApi` definition
  itself, same as any other Service implementation detail — reducers and Producers never reach into
  RTK Query's cache directly.

## Forbidden

- A Producer (`createAsyncThunk` payload creator or hand-rolled thunk body) that throws instead of
  resolving `err(...)` (`UZF-14`).
- A `.fulfilled` handler that reads a bare success value instead of branching on a `Result` (`UZF-3`).
- Treating `.rejected` as the primary failure path — Service failures are caught and returned as
  `err(...)` from `.fulfilled`; `.rejected` is a defensive fallback only (`RC-26`).
- A Page or Fragment calling an RTK Query auto-generated hook (`useXQuery`, `useXMutation`) directly
  instead of dispatching a Producer thunk that delegates to `.initiate(...)` (`RC-16`, `UZF-12`).
- A Producer reading the whole `RootState` via `getState()` in place of taking the specific
  arguments the effect needs (`UZF-15`).
- Direct `fetch`/`axios`/native-module calls inside a Producer — route through a `…Service`
  (`UZF-13`, `UZF-16`).
- A hand-rolled thunk (bypassing `createAsyncThunk`) used where the standard form would suffice —
  reserve `…Task` for genuine caller-held cancellation or progress-reporting needs (`RC-27`).
- A `…Task` that swallows a non-abort error silently instead of dispatching a completion event
  (`UZF-3`, `UZF-14`).
- Calling `router.navigate(...)` (or any navigation API) from inside a component instead of from a
  Producer treating the router as a Service (`RC-17`, `UZF-13`).
- Constructing `.pending`/`.fulfilled`/`.rejected` actions by hand instead of letting
  `createAsyncThunk` generate them from the thunk's type string.
