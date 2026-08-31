<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/01-feature-and-events.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 01 — Feature & Events

## Repo-specific placeholders

- `packages/core` — the shared package that holds the RTK state-logic tier (slices, selectors,
  shifters, producers/thunks, services, mappers) consumed by **both** render targets — the Next.js
  apps/web and the Expo apps/mobile (absent, this repo is web-only). KroWeb-style example: `packages/core`. The `library/`
  runtime (`result.ts`, `assertNever.ts`, `store.ts`, `hooks.ts`) lives inside `packages/core`.

(Feature/State/Event names in the snippets — `UserProfile`, `EditProfile` — are illustrative; this
stack has no live reference product yet. `createSlice`, `createAsyncThunk`, `PayloadAction`,
`extraReducers`, `builder.addCase`, `configureStore` are universal Redux Toolkit API names and are
never tokenized.)

Encodes the React + Redux Toolkit realization of UZF's Interactor/Reducer contract (`UZF-1`): every
feature is exactly **one `createSlice`** whose `reducers` and `extraReducers` are the *only* place
its own state is written, and whose per-arm logic — once delegated to a Shifter — is pure. RTK has
no shared base class to subclass the way Compose's `Feature<…>` or TCA's `@Reducer` do:
`createSlice` **is** the Interactor primitive already; the shared runtime (`Result`, `assertNever`,
the typed store/hooks) lives once in `packages/core/library`, not per feature.

---

## The Feature — one slice per feature (`RC-1`)

**Hard rules**

- **One slice per feature.** `export const userProfileSlice = createSlice({ name: "userProfile", … })`.
  Filename `<Name>Feature.ts`. Co-located with `<Name>Selectors.ts`, `<Name>Shifters.ts`,
  `<Name>Producer.ts` in one feature folder inside `packages/core` (`UZF-6`) — the folder is
  shared by both render targets; only the Page/Screen that consumes it lives per-target.
- **`state` is `interface <Name>State`**, co-located in the Feature file. Domain models only —
  never a wire-format `…Response`, a raw `Error`, or an in-flight `AbortController`/`Promise`
  handle (`UZF-8`). Split into a sibling `<Name>State.ts` only once the interface plus
  `initialState` exceeds roughly 40 lines. (The full `State` shape contract — one discriminated
  lifecycle field, `readonly` everywhere — is `RC-24`, detailed in
  `03-state-shifters-selectors.md`.)
- **A slice's `name` is globally unique** and is registered exactly once, in the root reducer map
  (`configureStore({ reducer: { userProfile: userProfileSlice.reducer, … } })`). Two slices never
  share a `name`; a slice is never spread into another slice's reducer map.
- **A slice's own state is written only by its own `reducers`/`extraReducers`.** A sibling feature
  never dispatches into another slice's reducer and never reaches into another slice's state
  directly — it reads through that slice's `…Selectors.ts` (`UZF-1`, `UZF-6`). Cross-slice
  coordination is a Selector composed at the root, never a cross-slice import inside a reducer.
- **Export only `.actions` and the slice itself** — the slice for `.reducer` registration, preview
  stores, and `getInitialState()`; never re-export the bare reducer-path string apart from through
  `.reducer`.

## Event naming (`UZF-2`)

RTK gives an Event two different surfaces — a `reducers` key (dispatched directly) and a thunk's
own lifecycle actions (dispatched by the thunk runtime). Both still follow the UZF-2 prefixes:

| Source | Prefix | RTK realization | Example |
| --- | --- | --- | --- |
| User intent (tap, swipe, pull) | `userDid…` | a `reducers` key | `userDidPullToRefresh(state)` |
| System / lifecycle signal | `on…` | a `reducers` key | `onViewLoaded(state, action: PayloadAction<{ profileId: string }>)` |
| Effect resolution (success + failure unified, `UZF-3`) | `on…Completed` | the async thunk's own `type` string, handled in `extraReducers` | `createAsyncThunk("userProfile/onProfileFetchCompleted", …)` — see `RC-2` |
| Child feature talking back | `child…Delegated…` | a `reducers` key | `childEditFragmentDelegatedClose(state)` |

Name a `reducers` key or a thunk's `type` string by its **intent or source**, never its mechanism
— `userDidPullToRefresh` / `onProfileFetchCompleted`, not `refreshProfile` or `fetchProfile`
(`UZF-2`).

**`RC-2` — the thunk `type` string is itself an event name, not a verb.** `createAsyncThunk`'s
first argument reads as `"<feature>/on<Thing>Completed"` — e.g.
`createAsyncThunk<Result<Profile, ProfileException>, { profileId: string }, { extra: ThunkExtra }>("userProfile/onProfileFetchCompleted", …)`.
A thunk type string named after its mechanism instead — `"userProfile/fetchProfile"` — is a
deviation from `UZF-2`'s hard rule, not a pattern to copy. The RTK-generated lifecycle suffix
(`.pending` / `.fulfilled` / `.rejected`) is *not* a second
event name layered on top — it is the one completion event's three possible phases (`UZF-3`); never
mint a distinct `on<Thing>Succeeded` / `on<Thing>Failed` pair alongside it.

## Reducers + extraReducers body shape (`RC-36`, `RC-4`, `RC-26`; `UZF-1`, `UZF-3`)

**`RC-36` — `reducers` and `extraReducers` are separate surfaces that never mix.**
`reducers` carries synchronous, locally-originated Events only — user intent, lifecycle
signals, child delegation. Each arm is `(state, action?) => void`, written in Immer's mutating
style. `extraReducers` carries thunk lifecycle only — `.addCase(xThunk.pending | .fulfilled | .rejected, …)`.
Never place a `userDid…`/`on…`/`child…Delegated…` handler inside `extraReducers`, and never
dispatch a synchronous `reducers` action from within a thunk's own lifecycle handling.

The mutation pattern inside either surface is `RC-4` (Shifters are the only mutation path — see
`03-state-shifters-selectors.md`): every arm that changes more than one field, or an invariant
between fields, delegates to a Shifter and applies it as `Object.assign(state, withThing(state,
args))` — the only allowed multi-field mutation. A single primitive assignment
(`state.editFragmentOpen = true`) is the only mutation permitted to bypass a Shifter (`UZF-10`,
tightened for the RTK/Immer draft-state form).

The `.pending`/`.fulfilled`/`.rejected` lifecycle contract itself is `RC-26` (fully detailed in
`04-producers-effects.md`): the `.fulfilled` arm's `action.payload` is a `Result<T, E>`, never a
bare `T` — this *is* the completion event of `UZF-3`. Branch on `result.ok`: the true half calls a
"loaded" Shifter, the false half calls the same "exception" Shifter that every other failure path
in the slice uses. The `.rejected` arm is a defensive fallback only — because a Producer-built
thunk never throws (`UZF-3`, `UZF-14`), `.rejected` should be structurally unreachable; it exists
solely so the `extraReducers` builder stays exhaustive against RTK's three lifecycle actions, and
it must route into the identical exception Shifter as the `.fulfilled` false branch, never a
distinct state shape or a distinct user-facing message.

```ts
extraReducers: (builder) => {
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
        // Defensive only — `fetchProfileThunk` is built to never reject (UZF-3/UZF-14).
        .addCase(fetchProfileThunk.rejected, (state, action) => {
            Object.assign(state, withException(
                state,
                { kind: "unknown", message: action.error.message ?? "Unknown error", recoverable: true },
            ));
        });
},
```

## `assertNever` exhaustiveness (`RC-9`, `UZF-3`, `UZF-9`)

(Same rule as `02-store-setup.md`'s `assertNever` section and
`00-architecture-overview.md`'s core rule 9 — restated here with the Feature-local
cases it covers; see those files for the canonical statement and the RTK-reducers-map
exemption.)

RTK's `reducers` object is keyed by property name, not a literal `switch (event.type)` — TypeScript
already forces every key to type-check against the slice's action-creator map, so `assertNever` is
**not** how exhaustiveness is enforced at that level. `assertNever` instead guards every place code
branches on a *value-level* discriminated union produced inside an arm:

- A `Result`'s two branches (`result.ok` true/false) inside `.fulfilled` — once both are handled,
  an unreachable `default: return assertNever(result)` in a helper that maps `Result` to a
  narrower type keeps future `Result` variants honest.
- An `…Exception`'s `kind` discriminant — inside a Shifter that varies behavior per `kind`, inside a
  Mapper's `toException` translation of a caught error, or inside a Page/Fragment render switch
  that picks copy/icon per `kind`. Every such `switch (exception.kind) { … default: return assertNever(exception); }`
  is mandatory (`UZF-9`).
- Any other feature-local sealed union modeled as a discriminated `kind`/`type` field and consumed
  with a `switch`.

```ts
// library/assertNever.ts
export function assertNever(value: never): never {
    throw new Error(`Unhandled discriminated-union case: ${JSON.stringify(value)}`);
}
```

Turn on `@typescript-eslint/switch-exhaustiveness-check` in `.github/workflows/pr.yml` so a missing arm
fails CI rather than review (SYNTHESIS §5 Phase 5).

## Forbidden

- Mutating slice state any way other than `Object.assign(state, withThing(...))` or a single
  primitive field assignment — reaching into nested state field-by-field for a multi-field change
  bypasses the Shifter and is rejected.
- A `reducers` key or thunk `type` string named after its mechanism (`fetchProfile`, `loadData`,
  `refreshProfile`) instead of intent/source (`UZF-2`).
- A second event for the same effect's failure path (`onProfileFetchFailed` alongside
  `onProfileFetchCompleted`) — forbidden by `UZF-3`; one completion event, one `Result`.
- Business logic inside a `reducers`/`extraReducers` arm beyond delegating to a Shifter — no inline
  `fetch`, no Mapper invocation, no service call (`UZF-13`); that already happened inside the
  Producer's thunk body before the arm ever runs.
- A `switch`/`if-else` chain over a `Result` branch or an `…Exception`'s `kind` with no terminal
  `assertNever` call.
- Registering the same slice `name` twice, or one slice's reducer importing and mutating another
  slice's `state` shape directly.
- Deriving a value from `state` inside a component instead of a `…Selectors.ts` `createSelector`
  (`RC-5`) — see `03-state-shifters-selectors.md`.
