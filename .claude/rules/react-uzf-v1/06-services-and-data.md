<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/06-services-and-data.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 06 — Services, Repositories & the Data Layer

## Repo-specific placeholders

- `packages/core` — the shared package (e.g. `packages/core`) where Services, Repositories,
  Providers, Mappers, and RTK Query API slices live, consumed by both `apps/web` (Next.js) and
  `apps/mobile (absent, this repo is web-only)` (Expo). Paths below are relative to it unless noted.
- Otherwise **none** — this rule carries no other repo-specific paths, hosts, targets, or product
  names. The example domain types (`ProfileService`, `Profile`, `EnvironmentProvider`, …) are
  illustrative, not repo config.

Implements `UZF-16` (external systems behind an injected Service with a stub; Repository as the
only stateful service-tier artifact) and `UZF-17` (wire types translated by a Mapper), tightened
for React/Redux Toolkit by `RC-6`/`RC-33` (Service shape), `RC-16` (wire primitives / RTK Query as
Service-tier), `RC-30` (Mapper lives at the Producer boundary) and `RC-47` (synchronous Providers).
`RC-48` extends the family for the web/native split this stack is unique in carrying.

## Service (`RC-6`, `RC-33` implement `UZF-16`)

Every external system — network, storage, device sensors, third-party SDKs, the platform's
push/biometrics/permissions APIs — is wrapped behind an interface whose Operations return a
`Promise` of the **wire** shape, and may throw:

```ts
export interface <X>Service {
    <op>(...): Promise<…Response>;
}
```

- **Two implementations minimum** per Service, both exported from the same
  `packages/core/services/<domain>/<X>Service.ts` file:
  - `live<X>Service: <X>Service` — the production binding (calls `fetch`, an SDK, or a platform API).
  - `stubbed<X>Service: <X>Service` — the test/preview binding, reading from a bundled
    `<x>.fixtures.json` sitting next to it. A Service that ships **live-only is incomplete**.
- **Stateless.** No caches, no in-flight tracking, no mutable module-level fields. If you need any
  of that, promote the concern to a Repository.
- Injected via the thunk `extra` argument (see "Service injection" below) — reducers and feature
  code never import a Service directly; only a Producer receives it.
- **The Service does not translate to `Result`.** It returns the wire `…Response` (or throws). The
  `Result<T, E>` boundary is the Producer's `createAsyncThunk` payload creator, which `try`/`catch`es
  and maps via the Mapper (`RC-30`) — matching `UZF-14`'s "the Effect never throws," not the Service.

```ts
// packages/core/services/network/ProfileService.ts

import type { ProfileResponse } from "../../models/ProfileResponse";
import fixtures from "./profile.fixtures.json" with { type: "json" };

/** UZF "Service" — stateless wrapper around the profile API. */
export interface ProfileService {
    fetchProfile(id: string, options?: { signal?: AbortSignal }): Promise<ProfileResponse>;
    updateDisplayName(id: string, name: string, options?: { signal?: AbortSignal }): Promise<ProfileResponse>;
}

export const liveProfileService: ProfileService = {
    async fetchProfile(id, { signal } = {}) {
        const res = await fetch(`https://api.example.com/profiles/${encodeURIComponent(id)}`, { signal });
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
        return (await res.json()) as ProfileResponse;
    },
    async updateDisplayName(id, name, { signal } = {}) {
        const res = await fetch(`https://api.example.com/profiles/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name }),
            signal,
        });
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
        return (await res.json()) as ProfileResponse;
    },
};

export const stubbedProfileService: ProfileService = {
    fetchProfile: async (id, _options) =>
        (fixtures.profiles as Record<string, ProfileResponse>)[id]
            ?? Promise.reject(Object.assign(new Error("not found"), { status: 404 })),
    updateDisplayName: async (id, name, _options) => ({
        ...(fixtures.profiles as Record<string, ProfileResponse>)[id]!,
        name,
    }),
};
```

### New Service operation checklist

Adding an Operation to an existing Service (or a new Service) means: add the method to the
interface, implement it on **both** `live…Service` and `stubbed…Service`, extend the fixture JSON
with the new scenario, then write the Producer that calls it. A PR that adds only the `live…`
side is incomplete — see Forbidden.

### Promote helper objects to a Service

Application-specific stores, resolvers, or "helper modules" that touch I/O or return a `Promise`
must be promoted to `interface <X>Service` form, not left as a bare module of loose exported
functions injected by hand into a Producer. If it is synchronous and cheap instead, it is a
`…Provider` (`RC-47`), never an un-abstracted import.

## Repository (`UZF-16`)

- A plain TS class coordinating **two or more** Services, constructed once and passed into
  `ThunkExtra` alongside its Services.
- The **only** service-tier type allowed to hold state — caches, dedupe, in-flight token-refresh
  tracking — and only when the coordination genuinely requires it.
- **Empty / placeholder Repositories are forbidden.** Delete them until they have a real
  coordination job.
- When a Repository does hold state, document it inline at the field:
  `// State holder: dedupe concurrent refresh calls.`

```ts
// packages/core/services/auth/AuthRepository.ts

export class AuthRepository {
    // State holder: dedupe concurrent token-refresh calls triggered by parallel 401s.
    private refreshInFlight: Promise<Result<Session, AuthException>> | null = null;

    constructor(
        private readonly authService: AuthService,
        private readonly sessionStorageService: SessionStorageService,
    ) {}

    async refreshSession(): Promise<Result<Session, AuthException>> {
        if (this.refreshInFlight) return this.refreshInFlight;
        this.refreshInFlight = this.performRefresh().finally(() => {
            this.refreshInFlight = null;
        });
        return this.refreshInFlight;
    }

    private async performRefresh(): Promise<Result<Session, AuthException>> {
        try {
            const response = await this.authService.refresh();
            await this.sessionStorageService.save(response);
            return ok(AuthMapper.toDomain(response));
        } catch (error) {
            return err(AuthMapper.toException(error));
        }
    }
}
```

## Provider (`RC-47`)

- A `…Provider` is a module exporting **synchronous** helpers: `current(): X`. Anything that could
  return a `Promise`, suspend, or block must be a Service instead.
- Reducers (`createSlice` arms) **and** Selectors **may** call Providers directly — they are cheap
  and synchronous, unlike Services which are Promise-based and Producer-only.
- Examples: `EnvironmentProvider`, `IntegrationAvailabilityProvider`, `ClockProvider`.

```ts
// packages/core/library/providers/EnvironmentProvider.ts

/** UZF "Provider" — synchronous, reducer/selector-readable. Never returns a Promise. */
export const EnvironmentProvider = {
    current(): "development" | "staging" | "production" {
        return (process.env.APP_ENV as "development" | "staging" | "production" | undefined)
            ?? "development";
    },
};
```

## Operation, wire primitives & RTK Query as Service (`RC-16`)

An **Operation** is one method on a Service interface (`fetchProfile`, `updateDisplayName`). The
raw wire/transport primitives beneath it are wrapped by a Service before any feature code touches
them:

| Primitive | Shape |
| --- | --- |
| `fetch` / platform HTTP client call | the raw network call — never imported outside `services/` |
| `AsyncStorage` / `localStorage` / IndexedDB accessor | the raw persistence call — wrapped by a Service (e.g. `SessionStorageService`) |
| WebSocket / SSE client | wrapped by a Service exposing `subscribe(...): () => void` (an unsubscribe), never a raw socket handle |
| RTK Query `builder.query` / `builder.mutation` | a network Operation exposed as a `createApi` endpoint — **Service-tier**, per below |

RTK Query's `createApi` endpoints are **Service-tier**, not Producer-tier. The auto-generated hook
(`useGetProfileQuery`) is **forbidden inside Pages and Fragments** — a Producer thunk dispatches the
endpoint's `initiate(...)` and normalizes the outcome into `Result`, exactly as it would for a
hand-written Service call:

```ts
// packages/core/services/network/profileApi.ts

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query";
import type { ProfileResponse } from "../../models/ProfileResponse";

/** UZF "Service" via RTK Query. Endpoints are Operations; the generated hooks stay unused. */
export const profileApi = createApi({
    reducerPath: "profileApi",
    baseQuery: fetchBaseQuery({ baseUrl: "https://api.example.com" }),
    endpoints: (builder) => ({
        getProfile: builder.query<ProfileResponse, string>({
            query: (id) => `profiles/${encodeURIComponent(id)}`,
        }),
    }),
});
```

```ts
// packages/core/features/userProfile/UserProfileProducer.ts (excerpt)

export const fetchProfileThunk = createAsyncThunk<
    Result<Profile, ProfileException>,
    { profileId: string },
    { extra: ThunkExtra }
>("userProfile/onProfileFetchCompleted", async ({ profileId }, { dispatch }) => {
    try {
        const response = await dispatch(profileApi.endpoints.getProfile.initiate(profileId)).unwrap();
        const profile = ProfileMapper.toDomain(response);
        return profile ? ok(profile) : err(ProfileExceptions.unknown("Malformed profile payload"));
    } catch (error) {
        return err(ProfileMapper.toException(error));
    }
});
```

Register `profileApi.reducer` and `profileApi.middleware` in `packages/core/library/store.ts`
exactly as any other slice — RTK Query's cache lives in the same store, but only a Producer ever
reads its endpoints.

## Mapper (`RC-30` implements `UZF-17`)

A plain module exported next to the model under `models/`, owning translation between wire and
domain with three functions:

- `toDomain(<X>Response): <X>Model | null` — `null` on malformed input so the caller surfaces a
  typed Exception rather than storing a partial domain object.
- `fromDomain(<X>Model): <X>Response` — only when the Service also writes.
- `toException(error: unknown): <X>Exception` — the **single** place that inspects a thrown
  `Error`/`TypeError`/HTTP-status shape and returns the discriminated-union `…Exception`. A
  Producer's `catch` block calls `<X>Mapper.toException(error)`; it never re-implements the
  mapping inline (an inline `mapToException` helper living in the Producer file is a stopgap, not
  the canon shape — fold it into the Mapper's exported surface).

```ts
// packages/core/models/ProfileMapper.ts

export const ProfileMapper = {
    toDomain(response: ProfileResponse): Profile | null {
        const joined = new Date(response.joined_at);
        if (Number.isNaN(joined.getTime()) || !response.id) return null;
        return {
            id: response.id, displayName: response.name, email: response.email,
            avatarUrl: response.avatar, joinedAt: joined,
        };
    },
    toException(error: unknown): ProfileException {
        if (error instanceof TypeError) return ProfileExceptions.offline();
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403) return ProfileExceptions.unauthorized();
        if (status === 404) return ProfileExceptions.notFound();
        return ProfileExceptions.unknown(error instanceof Error ? error.message : String(error));
    },
};
```

- Keep the type families separated across the boundary: a domain `<X>Model` never gains a
  serialization annotation or fetch-library conformance; a wire `<X>Response` never leaks a
  UI/identity concern.
- Domain models ship ≥7 mock variations (per `UZF-18`) in a build-excluded
  `models/__mocks__/<X>.mocks.ts`, so Services' `stubbed…` fixtures and Storybook stories consume
  real mock data rather than inline literals.

## Service injection (`packages/core/library/store.ts`)

Services and Repositories are wired through the thunk `extra` argument — RTK's built-in
dependency-injection seam. Reducers never import a Service; only a Producer's payload creator
receives one, via its third type parameter:

```ts
// packages/core/library/store.ts

export interface ThunkExtra {
    readonly profileService: ProfileService;
    readonly authRepository: AuthRepository;
}

export const makeStore = (extra: ThunkExtra = defaultExtra) =>
    configureStore({
        reducer: { userProfile: userProfileSlice.reducer, [profileApi.reducerPath]: profileApi.reducer },
        middleware: (getDefault) =>
            getDefault({ thunk: { extraArgument: extra } }).concat(profileApi.middleware),
    });
```

Tests and Storybook stories construct their own store with `stubbed…Service` / a fixture-backed
`ThunkExtra` — never the `live…` binding.

## Cross-platform Live implementations (`RC-48`)

A Service interface and its `stubbed…` binding live once in `packages/core` and are shared by
`apps/web` and `apps/mobile (absent, this repo is web-only)` unmodified. When the **live** behavior genuinely differs by
platform (secure storage, biometrics, push tokens, permissions), ship platform-specific `live…`
files resolved by the bundler's platform-extension convention — never a runtime `Platform.OS`
branch inside one `live…Service` implementation:

```
services/auth/
  SessionStorageService.ts        # interface (shared)
  liveSessionStorageService.web.ts     # localStorage / cookie-backed
  liveSessionStorageService.native.ts  # Expo SecureStore-backed
  stubbedSessionStorageService.ts      # shared fixture-backed stub
  sessionStorage.fixtures.json
```

The interface, the Mapper, the Producer, the Repository, and the `stubbed…` binding stay
**single-sourced** — only the `live…` file forks, and only for the Service whose underlying
platform API genuinely differs.

## Forbidden

- A Page or Fragment importing `fetch`, `axios`, or anything from `services/` directly (`RC-6`,
  `RC-16`) — a `no-restricted-imports` lint rule enforces this outside `services/`.
- A Page or Fragment importing an RTK Query auto-generated hook (`useGetProfileQuery`) instead of
  dispatching a Producer thunk (`RC-16`).
- A `Repository` with no body / no behavior (`UZF-16`).
- A `Service` without a `stubbed…Service` companion **and** a fixture JSON file — live-only is
  incomplete (`RC-33`).
- A `Service` that holds mutable module-level state — move the state into a Repository (`RC-6` /
  `UZF-16`).
- A Producer-local ad hoc error-mapping function that duplicates what belongs in the Mapper's
  `toException` (`RC-30`).
- A `live…Service` that branches on `Platform.OS` internally instead of shipping `.web`/`.native`
  file variants (`RC-48`).
- A reducer (`createSlice` arm) that calls a Service, or a Provider that returns a `Promise`
  (`RC-47` / `UZF-13`).
- Throwing out of a `createAsyncThunk` payload creator, or returning a non-`Result` value from a
  Producer (`UZF-14`).
