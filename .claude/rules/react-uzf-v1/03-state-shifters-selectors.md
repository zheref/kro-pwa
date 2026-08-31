<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/03-state-shifters-selectors.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 03 — State, Shifters, Selectors

## Repo-specific placeholders

- `packages/core` — the shared `packages/core` tree. Slices, State, Shifters, Selectors, Producers, Services, and Mappers all live here and are consumed identically by `apps/web` (Next.js) and `apps/mobile (absent, this repo is web-only)` (Expo) — only the render layer differs between the two targets. The only genuinely product-specific literal in this rule; everything else is universal React/RTK API or an illustrative feature/domain name.

Implements `UZF-8`/`UZF-9` (State), `UZF-10` (Shifters), `UZF-11` (Selectors);
tightened for the Redux Toolkit reducer by `RC-24`, `RC-4`, `RC-19`, `RC-5`.

## State (`RC-24` implements `UZF-8`, `UZF-9`)

- **One `interface <Name>State` per feature/slice.** Co-located with `createSlice({ name: "<name>", … })` inside `<Name>Feature.ts` — never a standalone `state.ts` file split from its slice.
- Holds **domain types only** — `Profile | null`, `Suggestion[]`, `<Name>Exception | null`. No wire-format `…Response` shapes, no raw `Error`/`TypeError`, no `Promise`, no `AbortController` handle, no DOM/browser objects. Those are mapped to domain types at the Producer/Mapper boundary (`UZF-8`; the Mapper contract lives in `07`).
- A lifecycle (idle / loading / loaded / failed) is modeled as **one discriminated-union field**, never as parallel `isLoading: boolean` + `exception: …Exception | null` fields — those can represent invalid combinations (e.g. "loaded AND failed" at once), which `UZF-9` forbids. Give the State a single `load: LoadState` field; the `"loaded"` case carries the data and the `"failed"` case carries the exception, so they can never coexist (`UZF-9`).
- Properties are `readonly`. State is never constructed with a mutating assignment outside a Shifter or an Immer draft (see `RC-19`).

```ts
// packages/core/features/userProfile/UserProfileFeature.ts

export type LoadState =
    | { readonly kind: "idle" }
    | { readonly kind: "loading" }
    | { readonly kind: "loaded"; readonly profile: Profile }
    | { readonly kind: "failed"; readonly exception: ProfileException };

export interface UserProfileState {
    readonly profileId: string | null;
    readonly load: LoadState;
    readonly editFragmentOpen: boolean;
}

const initialState: UserProfileState = {
    profileId: null,
    load: { kind: "idle" },
    editFragmentOpen: false,
};
```

- **State is never constructed inline in stories or tests.** Canned variants (`loadingState`, `loadedState`, `erroredState`) live in `<Name>.mocks.ts`; Storybook stories and tests consume those (`UZF-18`).

## Shifters (`RC-4` implements `UZF-10`)

- File: `<Name>Shifters.ts`.
- Each Shifter is a **pure function** `function with<Foo>(state: <Name>State, args): <Name>State` — never a class, never a hook (glossary: Shifter = "Pure `with…(state, args)` function in `…Shifters.ts`").
- Body returns a **new plain object** — `{ ...state, ... }` plus pure derivations of fields from `args`. No I/O, no `Date.now()`, no `Math.random()`, no reads of the DOM, environment, or a Service (`UZF-10`).
- **One concern per Shifter.** "Loading started, clear the stale exception" is one concern and fits in one Shifter, even though it touches more than one field.
- Applied inside a `createSlice` reducer arm as `Object.assign(state, withFoo(state, args))` — this is the **only** sanctioned mutation pattern for a computed change (per the general architecture's Form B). A **single primitive assignment** (`state.editFragmentOpen = true`) may be written inline; anything wider than one field, or anything derived, goes through a named Shifter.
- **Never inline the equivalent of a multi-field `copy(...)`/spread block inside a reducer arm.** If you catch yourself writing `state.foo = a; state.bar = b;` for one related change, extract a Shifter.
- If a Shifter genuinely needs the current time or an id, pass it in as an `args` value — the Shifter stays pure (`UZF-10`).
- Test every Shifter with ≥ 3 cases (typical, boundary, no-op) (`UZF-18`).

```ts
// packages/core/features/userProfile/UserProfileShifters.ts

export function withLoadingStarted(state: UserProfileState): UserProfileState {
    return { ...state, load: { kind: "loading" } };
}

export function withProfileLoaded(state: UserProfileState, profile: Profile): UserProfileState {
    return { ...state, load: { kind: "loaded", profile } };
}

export function withException(state: UserProfileState, exception: ProfileException): UserProfileState {
    return { ...state, load: { kind: "failed", exception } };
}
```

```ts
// packages/core/features/userProfile/UserProfileFeature.ts (reducer arm)

userDidPullToRefresh(state) {
    Object.assign(state, withLoadingStarted(state));
},
```

### Immer (`RC-19` — tightens the `createSlice` mutation surface)

- `createSlice` wraps every reducer arm in an Immer producer, so the `state` a reducer (and the Shifter it calls) receives is technically an Immer **draft** — a mutation-tracking proxy, not a plain object. A Shifter still treats it as read-only: read fields off the draft to build a brand-new plain object via spread, and never assign into the draft from inside the Shifter body. Only the `Object.assign(state, ...)` call at the reducer-arm call site writes to the draft.
- Immer's own mutation syntax (writing `state.foo.bar = baz` directly and letting Immer produce the new tree) is reserved for genuinely **nested** state that a spread-based Shifter would make unreadable — and even then it stays scoped to that one nested write, never scattered across a reducer arm as a substitute for a Shifter.
- **Flat slice state — the common case — always goes through a pure Shifter + `Object.assign`, never ad hoc Immer draft mutation,** so the state transition stays unit-testable in isolation from the slice (`UZF-10`).

## Selectors (`RC-5` implements `UZF-11`)

- File: `<Name>Selectors.ts`.
- Built with `createSelector` from RTK. **No selector logic inline inside a `useAppSelector` arrow function** beyond a plain O(1) field read (`useAppSelector((s) => s.userProfile.profileId)`) — anything derived (a boolean combining two fields, a formatted string, a filtered/sorted list) is extracted to a named Selector in `…Selectors.ts` and consumed as `useAppSelector(selectFoo)`.
- Composed safely from other Selectors or from the slice's own state slice — never from `Date`, `Math.random`, a Service, or component scope (`UZF-11`). `RootState` is the only input.
- Cross-slice reads compose through Selectors built at the root level — never by importing another feature's slice/state shape directly (`UZF-6`).
- Test every Selector with ≥ 3 cases (`UZF-18`).

```ts
// packages/core/features/userProfile/UserProfileSelectors.ts

const slice = (s: RootState) => s.userProfile;

export const selectShouldShowEmptyState = createSelector(
    [slice],
    (s) => s.load.kind === "idle"
);

export const selectIsLoading = createSelector([slice], (s) => s.load.kind === "loading");

export const selectProfile = createSelector(
    [slice],
    (s) => (s.load.kind === "loaded" ? s.load.profile : null)
);

export const selectException = createSelector(
    [slice],
    (s) => (s.load.kind === "failed" ? s.load.exception : null)
);

export const selectAvatarAccessibilityLabel = createSelector(
    [slice],
    (s) => {
        const name = s.load.kind === "loaded" ? s.load.profile.displayName : "";
        return name.length > 0 ? `Avatar of ${name}` : "User avatar";
    }
);
```

## Forbidden

- Mutating state from within a Shifter or a Selector — a Shifter returns a new object; a Selector never dispatches or mutates.
- Reading external state (`Date.now()`, `Math.random()`, environment, a Service) from a Shifter or Selector. Pass the dependency in as an `args` value if absolutely needed (`UZF-10`, `UZF-11`).
- Parallel `isLoading: boolean` + `exception: …Exception | null` fields representing one lifecycle — model it as one `load: LoadState` union instead (`RC-24`, `UZF-9`).
- Any reducer-arm mutation wider than a single primitive assignment that does not go through `Object.assign(state, withFoo(...))` (`RC-4`).
- Scattering Immer draft mutations (`state.foo.bar = baz`) across a reducer arm as a substitute for a Shifter (`RC-19`).
- A selector defined inline inside a component or a `useAppSelector` callback instead of `…Selectors.ts` (`RC-5`).
- Cross-slice imports of another feature's internal state shape (`UZF-6`; use a root-level Selector).
