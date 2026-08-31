<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/09-testing.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 09 — Testing

Implements **UZF-18** (per-artifact minimums), **UZF-19** (coverage floor),
**UZF-20** (scenario naming), **UZF-26** (visual evidence). Stack binding:
**RC-53** (Vitest/Jest + React Testing Library + Storybook 8). The artifacts under
test are the ones defined by their own rules elsewhere in this handbook — the
Interactor/slice, Shifters, Selectors, Producer (`createAsyncThunk` factories),
Services (`live…Service` / `stubbed…Service`), Mappers, Models, and the Page /
Fragment render layer.

## Repo-specific placeholders

Everything below is generic canon. The tokens are the only repo-local values; a
product repo substitutes its own. This stack has no live reference product yet,
so example values below are illustrative, not fixed.

| Token | Illustrative value | What it is |
| --- | --- | --- |
| `packages/core` | `packages/core` | Shared RTK state-logic tier — slices, selectors, shifters, producers, services, mappers, models — **and their unit tests**. Written and tested once for both render targets (KEY MODEL). |
| `apps/web` | `apps/web` | Next.js App Router app. Hosts the web render layer (Server Page + Client Wrapper + the UZF `…Page`/`…Fragment`) and its Storybook stories / render tests, run under jsdom via Vitest. |
| `apps/mobile (absent, this repo is web-only)` | `apps/mobile` | Expo app. Hosts the native render layer and its Storybook-for-RN stories / render tests, run under Jest (`jest-expo` preset) + React Native Testing Library. |
| `.github/workflows/pr.yml` | `.github/workflows/test.yml` | CI workflow running the Vitest suite (`packages/core` + `apps/web`), the Jest suite (`apps/mobile (absent, this repo is web-only)`), and the Storybook test-runner. |

---

## Minimum coverage per feature (enforced in review — implements UZF-18)

| Artifact | Tests required |
| --- | --- |
| Reducer action (sync `reducers` case) | ≥ 3 cases (typical / boundary / no-op) called directly against the slice reducer, each named as a real-world scenario — **RC-12** |
| Reducer arm for a thunk lifecycle (`extraReducers` `.pending`/`.fulfilled`/`.rejected`) | ≥ 3 cases (happy / failure / edge) driven through the full thunk against a stubbed Service — **RC-54** |
| Selector | ≥ 3 cases (typical / edge / empty), called directly against a hand-built root-state slice — **RC-55** |
| Shifter | ≥ 3 cases (typical / boundary / no-op) — **RC-56** |
| Producer (`createAsyncThunk` factory) | ≥ 3 cases (happy / failure / edge) using the `stubbed…Service` injected via the thunk `extra` argument — never a mocked `fetch`/`axios` — **RC-54** (see also `RC-35`: tests never reach the live network) |
| Mapper | ≥ 3 cases each for `toDomain` / `fromDomain` (/ `toException` where present) |
| Page / Fragment | ≥ 3 Storybook stories **and** ≥ 3 mirroring RTL render tests, both consuming the same `<Feature>Mocks` — **RC-11** |
| Route handler / Server Action (Next.js Producer-equivalents) | ≥ 3 cases (happy / failure / edge) called directly with a stubbed Service, asserting on the returned `Result` — **RC-43** |
| Model | ≥ 7 mock variants in `__mocks__/<Model>.mocks.ts` — **RC-13** |

Coverage floor per **UZF-19**: every touched file ≥ 80 % line coverage; note
exemptions (Server Page / Client Wrapper passive shells — **RC-57**, generated
code, mock/DI files) in the PR.

## Toolbox (RC-53)

- **`packages/core` and `apps/web`**: Vitest, `@testing-library/react`,
  `@testing-library/jest-dom`.
- **`apps/mobile (absent, this repo is web-only)`**: Jest with the `jest-expo` preset,
  `@testing-library/react-native`.
- **Both**: Storybook 8 (`@storybook/react` for `apps/web`,
  `@storybook/react-native` — or the platform's on-device story loader — for
  `apps/mobile (absent, this repo is web-only)`), plus the Storybook test-runner (or Chromatic) to execute
  and capture every story in CI.
- A `<Feature>Mocks.ts` per feature for canned `State` variants — **both
  Storybook stories and render tests consume the same source** (never
  construct `State` inline).
- A `profileMocks`-style (illustrative name) `__mocks__/<Model>.mocks.ts` per
  domain model.

Vitest and Jest are both present by design: `packages/core` and
`apps/web` run on Vitest (native ESM, fast jsdom); `apps/mobile (absent, this repo is web-only)` runs on
Jest because Metro's RN toolchain expects it. Both expose the same
`describe`/`it`/`expect` surface, so a test file's *shape* is portable across
runners even though the runner differs per render target.

## Test file naming

```
<Feature>Feature.test.ts        # reducer actions + extraReducers lifecycle
<Feature>Selectors.test.ts
<Feature>Shifters.test.ts
<Feature>Producer.test.ts
<Feature>Mapper.test.ts
<Feature>Page.stories.tsx
<Feature>Page.test.tsx
<Feature>Fragment.stories.tsx
<Feature>Fragment.test.tsx
```

## Patterns

### Shifter / Selector / Mapper tests (RC-55, RC-56)

Pure. No store, no dispatch, no `Provider`, no timers or I/O — only the
function's inputs and return value. The test name encodes the real-world
scenario (UZF-20):

```ts
// packages/core/features/profile/UserProfileShifters.test.ts
it("withLoadingStarted clears any prior exception (user retries after an error)", () => {
    const result = withLoadingStarted({ ...base, load: { kind: "failed", exception: ProfileExceptions.offline() } });
    expect(result.load.kind).toBe("loading");
});
```

Selectors are exercised the same way, against a hand-built root-state slice —
never through a real store or `useAppSelector`:

```ts
// packages/core/features/profile/UserProfileSelectors.test.ts
it("empty-state is false when an exception is present (offline retry surface)", () => {
    expect(selectShouldShowEmptyState(rootWith({ load: { kind: "failed", exception: ProfileExceptions.offline() } }))).toBe(false);
});
```

### Reducer action tests (RC-12)

A sync `reducers` case is called directly against the slice's `reducer`
function — no `configureStore`, no middleware:

```ts
// packages/core/features/profile/UserProfileFeature.test.ts
it("onViewLoaded starts loading and stamps the profile id (first mount)", () => {
    const next = userProfileSlice.reducer(initialState, onViewLoaded({ profileId: "1" }));
    expect(next.profileId).toBe("1");
    expect(next.load.kind).toBe("loading");
});
```

### Producer tests and thunk-lifecycle reducer arms (RC-54)

Use the `stubbed…Service`, injected through the thunk's `extra` argument — never
a mocked `fetch`/`axios`. Dispatch the real thunk against a scoped store and
assert on `getState()`. The thunk never rejects on a domain failure — it
resolves a `Result` in its `fulfilled` payload — so the "failure" case asserts
on the `load` union's `failed` variant (`load.kind === "failed"`, carrying the
`Exception`), not on a thrown error or a caught rejection:

```ts
// packages/core/features/profile/UserProfileFeature.test.ts
it("network failure surfaces an offline exception (user on the subway)", async () => {
    const service: ProfileService = {
        fetchProfile: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
        updateDisplayName: vi.fn(),
    };
    const store = makeStoreWith(service);
    await store.dispatch(fetchProfileThunk({ profileId: "1" }));

    const { load } = store.getState().userProfile;
    expect(load.kind).toBe("failed");
    if (load.kind === "failed") expect(load.exception.kind).toBe("offline");
});
```

The defensive `.rejected` reducer arm (Producers never throw, so this is a
fallback, not the primary path) gets exactly one scenario test proving it
degrades to a generic exception rather than crashing — it is never the case
that carries the "failure" coverage requirement.

### Storybook stories + mirroring render tests (RC-11)

Every Page/Fragment ships **≥ 3 Storybook stories**, each preloading a scoped
store from `<Feature>Mocks` (never constructing `State` inline):

```tsx
// packages/app/src/features/UserProfile/UserProfilePage.stories.tsx
export const LoadedTypical: StoryObj<typeof UserProfilePage> = {
    decorators: [(Story) => <Provider store={makePreviewStore({ load: { kind: "loaded", profile: profileMocks.typical } })}><Story /></Provider>],
    args: { profileId: profileMocks.typical.id },
};
export const Loading: StoryObj<typeof UserProfilePage> = {
    decorators: [(Story) => <Provider store={makePreviewStore({ load: { kind: "loading" } })}><Story /></Provider>],
    args: { profileId: "loading" },
};
export const ExceptionOffline: StoryObj<typeof UserProfilePage> = {
    decorators: [(Story) => <Provider store={makePreviewStore({ load: { kind: "failed", exception: ProfileExceptions.offline() } })}><Story /></Provider>],
    args: { profileId: "offline" },
};
```

The same three states are asserted by **mirroring RTL render tests** — if the
story set and the test set diverge, one of them is wrong:

```tsx
// packages/app/src/features/UserProfile/UserProfilePage.test.tsx
it("renders the loaded profile — returning user opens their page", () => {
    const store = makePreviewStore({ load: { kind: "loaded", profile: profileMocks.typical } });
    render(<Provider store={store}><UserProfilePage profileId={profileMocks.typical.id} /></Provider>);
    expect(screen.getByText(profileMocks.typical.displayName)).toBeInTheDocument();
});
```

> **The Storybook test-runner's (or Chromatic's) captures of these stories
> double as the PR's mandatory UI screenshots (UZF-26).** Capture one image
> per user-visible state, mirroring the story/render-test set 1:1 — never
> stage separate screenshots. `apps/mobile (absent, this repo is web-only)` Fragments follow the same
> pairing under Storybook-for-RN + React Native Testing Library.

### Route handlers and Server Actions as Producers (RC-43)

`app/api/**/route.ts` handlers and `"use server"` Server Actions are
Producer-equivalents (they call Services and return a `Result`). Test them the
same way as a thunk Producer — call the function directly (no HTTP server, no
Next.js request/response runtime) with a stubbed Service, ≥ 3 scenario cases:

```ts
it("update rejects an empty display name (user clears the field and saves)", async () => {
    const result = await updateProfileAction({ id: "1", name: "" }, { profileService: stubbedProfileService });
    expect(result.ok).toBe(false);
});
```

### Server Page / Client Wrapper — passive, exempt (RC-57)

`app/**/page.tsx` (Server Component) and its `…PageClient.tsx` wrapper hold no
logic — param resolution, optional prefetch, and prop forwarding only. They
carry **no** per-artifact test minimum; all coverage lives in the
framework-agnostic `…Page.tsx` (RC-11; the Server Page / Client Wrapper themselves are `RC-38`/`RC-39`). A Server Page or Client Wrapper that
grows a conditional, a `useState`, or a store read is a code-review finding
before it is a testing gap — the fix is to move the logic down into the UZF
Page, not to add tests around the route file.

## Mocks

Domain models ship **≥ 7 `mock…` fixtures** in `__mocks__/<Model>.mocks.ts`
(RC-13), spanning: **happy, empty/neutral, long, non-ASCII, missing optional
fields, stale-timestamp, just-updated** — the same convenient/neutral/
inconvenient spread as UZF-18:

```ts
// packages/core/models/__mocks__/Profile.mocks.ts
export const profileMocks = {
    typical:   { id: "1", displayName: "Ada Lovelace", /* … */ } satisfies Profile,
    newUser:   { id: "2", displayName: "New User", avatarUrl: null, /* … */ } satisfies Profile,
    noAvatar:  { id: "3", displayName: "Grace Hopper", avatarUrl: null, /* … */ } satisfies Profile,
    longName:  { id: "4", displayName: "Looooong Name ".repeat(6).trim(), /* … */ } satisfies Profile,
    emptyName: { id: "5", displayName: "", /* … */ } satisfies Profile,
    unicode:   { id: "6", displayName: "山田 太郎 🌸", /* … */ } satisfies Profile,
    og:        { id: "7", displayName: "OG User", /* … */ } satisfies Profile,
};
```

Per-feature `<Feature>Mocks.ts` files produce the canned `State` variants
(`loadingState`, `loadedState`, `erroredState`, `partiallyLoadedState`, …) that
both Storybook stories and render tests consume — a single source of truth for
every rendered state.

## What NOT to test / Forbidden

- **Mocking `fetch`/`axios` directly, or a network-level interceptor (MSW) as
  the default test boundary.** Stub the `Service` interface instead (UZF-16) —
  a Producer test injects `stubbed…Service`, it does not intercept the wire.
- **Asserting that a thunk "rejects" as the primary failure case.** Producers
  never throw; a domain failure is a `Result.err(...)` inside the `fulfilled`
  payload. The `.rejected` reducer arm gets one defensive-fallback test, never
  the "failure" coverage slot.
- **Constructing `<Feature>State` inline** in a story, a render test, or a
  reducer test instead of via `<Feature>Mocks`.
- **Snapshot-testing raw DOM output** (`toMatchSnapshot()` on a render tree).
  Use RTL's semantic queries (`getByRole`, `getByText`) so a test asserts
  behavior, not markup shape.
- **Raw `useSelector`/`useDispatch`**, or a `connect()`-based harness, in test
  setup — use the typed `useAppSelector`/`useAppDispatch` the same as
  production code.
- **Testing a Page/Fragment through the real router.** Stub `NavigationService`
  (Next.js) or the equivalent Expo Router/Solito navigation seam; never let a
  render test actually navigate.
- **Tests skipped (`it.skip`/`describe.skip`)** for longer than the PR that
  introduced them. Either delete or fix.

## Test naming (implements UZF-20)

Every test name encodes a real-world scenario, not a mechanical label:
`` "withLoading clears exception — pull to refresh after a previous error" ``.
Reject `"test1"`, `"it works"`, `"handles state"` — they don't describe a
scenario.

## Enforcement

Beyond review, wire these into CI (`.github/workflows/pr.yml`) and ESLint:
fail the build when a Page/Fragment's story count and render-test count
diverge, when `toMatchSnapshot()` is called on a DOM tree, when `fetch`/`axios`
is imported outside a `…Service` file, or when the Storybook test-runner
reports a story that fails to render without a matching capture.
