<!-- GENERATED from bankai-core@v0.11.2/handbooks/stacks/react-uzf-v1/rules/07-models-mocks-mappers.md — DO NOT EDIT; change the handbook and re-run sync-canon. -->
<!-- Canonical source in bankai-core; product repos carry a generated mirror (CON-13). -->

# 07 — Models, Mocks & Mappers

## Repo-specific placeholders

- `packages/core` — the shared `packages/core` module that holds `models/`, `services/`,
  and the RTK state-logic tier (slices, selectors, shifters, producers). Both `apps/web`
  (Next.js) and `apps/mobile (absent, this repo is web-only)` (Expo) import from here — this stack shares one state-logic
  tier across two render targets, so a domain Model, its Mapper, and its Exception are
  authored **once**, never duplicated per app.

Example domain types (`Profile`, `ProfileException`, …) and the feature name `UserProfile`
used below are **illustrative, not repo config** — nothing here is product-specific.

Implements `UZF-8` (State holds domain types only; wire-format out) and `UZF-17` (wire/
persistence types cross the boundary through a Mapper); tightened for React + Redux Toolkit
by `RC-28` (Model), `RC-29` (Response), `RC-30` (Mapper), `RC-8` (Exception), `RC-13` (model
mocks), and `RC-31` (state mocks).

## Model (`RC-28` implements `UZF-8`)

- Domain types only: `export interface <Name> { readonly … }`. Every field `readonly` — a
  Model is immutable from a feature's perspective.
- **No wire-format concerns** on the Model: no field renamed to match a snake_case payload,
  no serialization decorator (TS has none natively, but do not hand-roll one), no `Response`
  or `Entity` shape leaking in. Those live on the `Response` type (`RC-29`) — never on the
  domain Model.
- One model per file. The file name matches the type name: `packages/core/models/<Name>.ts`.

```ts
// packages/core/models/Profile.ts

/** UZF domain model. Immutable from a feature's perspective. */
export interface Profile {
    readonly id: string;
    readonly displayName: string;
    readonly email: string;
    readonly avatarUrl: string | null;
    readonly joinedAt: Date;
}
```

## Response (`RC-29` implements `UZF-17`)

- `export interface <Name>Response { … }` lives beside the Model in
  `packages/core/models/<Name>Response.ts` (or under `packages/core/services/<x>/` for a
  service-scoped wire shape).
- Field names **mirror the wire format** exactly (including `snake_case`) — never rename them
  in the type to look idiomatic. The Mapper (`RC-30`), not the type, bridges wire naming to
  domain naming.
- The Service returns `Response`; the Producer's effect calls the Mapper to convert
  `Response → Model` before it ever reaches a reducer. **Features (Pages, Fragments,
  reducers, selectors) never import a `Response` type.**

```ts
// packages/core/models/ProfileResponse.ts

/** Wire-format response returned by the Profile API. Field names mirror the wire payload. */
export interface ProfileResponse {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly avatar: string | null;
    readonly joined_at: string; // ISO8601
}
```

## Mapper (`RC-30` implements `UZF-17`)

- `export const <Name>Mapper = { toDomain, fromDomain, toException }` — a plain object of
  **pure functions**, module-scoped (no DI container needed; a Mapper takes no dependency,
  so it is simply imported where used — by the Producer, never by a reducer or a component).
- `toDomain(response) => Model | null` — returns `null` (never throws) on a malformed payload,
  so the Producer surfaces a typed `Exception` instead of an unhandled rejection.
- `fromDomain(model) => Response` — the inverse, for `PATCH`/`PUT` bodies and optimistic-update
  round-trips.
- `toException(error: unknown) => <Name>Exception` — pattern-matches the thrown value
  (`TypeError` for network failures, an HTTP `status` on the caught error, otherwise unknown)
  into the domain's discriminated `Exception` (`RC-8`). **All three functions live in the
  Mapper module — do not scatter a second, ad hoc `mapToException`-style helper next to the
  Producer.** Folding error-mapping into the Mapper keeps the Producer a state-free effect
  factory (`UZF-15`) and keeps every wire ↔ domain ↔ exception conversion in one pure,
  independently unit-tested module (`UZF-17`).

```ts
// packages/core/models/ProfileMapper.ts

import type { Profile } from "./Profile";
import type { ProfileResponse } from "./ProfileResponse";
import { ProfileExceptions, type ProfileException } from "./ProfileException";

export const ProfileMapper = {
    toDomain(response: ProfileResponse): Profile | null {
        const joined = new Date(response.joined_at);
        if (Number.isNaN(joined.getTime())) return null;
        if (!response.id) return null;
        return {
            id:          response.id,
            displayName: response.name,
            email:       response.email,
            avatarUrl:   response.avatar,
            joinedAt:    joined,
        };
    },

    fromDomain(model: Profile): ProfileResponse {
        return {
            id:         model.id,
            name:       model.displayName,
            email:      model.email,
            avatar:     model.avatarUrl,
            joined_at:  model.joinedAt.toISOString(),
        };
    },

    toException(error: unknown): ProfileException {
        if (error instanceof TypeError) return ProfileExceptions.offline();
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403) return ProfileExceptions.unauthorized();
        if (status === 404) return ProfileExceptions.notFound();
        return ProfileExceptions.unknown(error instanceof Error ? error.message : "Unknown error");
    },
};
```

## Exception (`RC-8` implements `UZF-8`)

- `export type <Name>Exception = { readonly kind: "…"; readonly message: string; readonly
  recoverable: boolean } | …` — a **discriminated union** on `kind`, never a bare `string` or
  `Error` held in `State`. Cases mirror UX recovery paths (`unauthorized`, `notFound`,
  `offline`, `unknown`, …).
- A companion factory object, `<Name>Exceptions`, constructs each case (`.offline()`,
  `.notFound()`, `.unknown(message)`) so call sites never hand-assemble the literal.
- Every `switch (exception.kind)` (or any switch over an Event/Exception union) ends its
  default arm with `assertNever(exception)` from `library/assertNever.ts` — the SYNTHESIS
  exhaustiveness rule — so adding a new `kind` without updating every switch fails the build.
- `<Name>Exception` lives in the same file as the Mapper's caller expects, or its own
  `<Name>Exception.ts` beside the Model.

```ts
// packages/core/models/ProfileException.ts

/**
 * UZF "Exception" — user-facing problem info, distinct from `Error`.
 * Discriminated union so reducers switch exhaustively on `kind`.
 */
export type ProfileException =
    | { readonly kind: "unauthorized"; readonly message: string; readonly recoverable: false }
    | { readonly kind: "notFound";     readonly message: string; readonly recoverable: false }
    | { readonly kind: "offline";      readonly message: string; readonly recoverable: true  }
    | { readonly kind: "unknown";      readonly message: string; readonly recoverable: true  };

export const ProfileExceptions = {
    unauthorized: (): ProfileException => ({ kind: "unauthorized", message: "You need to sign in again.", recoverable: false }),
    notFound:     (): ProfileException => ({ kind: "notFound",     message: "We couldn't find that profile.", recoverable: false }),
    offline:      (): ProfileException => ({ kind: "offline",      message: "You appear to be offline.", recoverable: true }),
    unknown:      (message: string): ProfileException => ({ kind: "unknown", message, recoverable: true }),
};
```

State never holds `Error`, a raw thrown value, or a `Response<…>` — the Mapper's
`toException`/`toDomain` must already have produced a domain `Exception` or a domain `Model`
before a Shifter writes it into `State` (`UZF-8`).

## Mock fixtures — ≥ 7 per Model (`RC-13` implements `UZF-18`)

Every domain Model has a sibling `__mocks__/<Name>.mocks.ts` file (excluded from the
production bundle via the test-runner config) exporting **at least seven** named variants as
a single object, each built with `satisfies <Name>` so a Model shape change is caught at the
mock, not silently widened.

```ts
// packages/core/models/__mocks__/Profile.mocks.ts

import type { Profile } from "../Profile";

export const profileMocks = {
    typical:   { id: "1", displayName: "Ada Lovelace", email: "ada@example.com", avatarUrl: "https://i.pravatar.cc/300?u=ada", joinedAt: new Date("2023-01-01") } satisfies Profile, // happy path
    noAvatar:  { id: "3", displayName: "Grace Hopper",  email: "grace@example.com", avatarUrl: null, joinedAt: new Date("2024-08-01") } satisfies Profile,                            // missing-optional
    longName:  { id: "4", displayName: "Looooong Name ".repeat(6).trim(), email: "long@example.com", avatarUrl: null, joinedAt: new Date() } satisfies Profile,                        // long
    emptyName: { id: "5", displayName: "", email: "noname@example.com", avatarUrl: null, joinedAt: new Date() } satisfies Profile,                                                     // empty
    unicode:   { id: "6", displayName: "山田 太郎 🌸", email: "yamada@example.com", avatarUrl: null, joinedAt: new Date() } satisfies Profile,                                          // non-ASCII
    og:        { id: "7", displayName: "OG User", email: "og@example.com", avatarUrl: "https://i.pravatar.cc/300?u=og", joinedAt: new Date("2012-01-01") } satisfies Profile,          // stale-timestamp
    newUser:   { id: "2", displayName: "New User", email: "new@example.com", avatarUrl: null, joinedAt: new Date() } satisfies Profile,                                                // just-updated
};
```

Variants must cover: **happy / missing-optional / long / empty / non-ASCII / stale-timestamp /
just-updated** — the same seven categories `UZF-18` requires (3 convenient, 1 neutral, 3
inconvenient), just named to the domain at hand.

## State mocks (`RC-31` implements `UZF-18`)

Per feature, a `<Feature>Mocks.ts` file exports canned **partial-state** fragments, built once
against the slice's own `getInitialState()`, so Storybook decorators and Vitest tests share
one source of truth instead of each re-assembling a preload object inline.

```ts
// packages/core/features/userProfile/UserProfileMocks.ts

import { userProfileSlice } from "./UserProfileFeature";
import { profileMocks } from "../../models/__mocks__/Profile.mocks";
import { ProfileExceptions } from "../../models/ProfileException";

const base = userProfileSlice.getInitialState();

export const UserProfileMocks = {
    idle:    base,
    loading: { ...base, load: { kind: "loading" } },
    loaded:  { ...base, load: { kind: "loaded", profile: profileMocks.typical } },
    errored: { ...base, load: { kind: "failed", exception: ProfileExceptions.offline() } },
    partial: { ...base, load: { kind: "loaded", profile: profileMocks.noAvatar } },
};
```

```tsx
// packages/app/src/features/UserProfile/UserProfilePage.stories.tsx (excerpt)

import { makeStore } from "packages/core/src/library/store";

export const LoadedTypical: StoryObj<typeof UserProfilePage> = {
    decorators: [(Story) => (
        <Provider store={makeStore(undefined, { userProfile: UserProfileMocks.loaded })}>
            <Story />
        </Provider>
    )],
    args: { profileId: profileMocks.typical.id },
};
```

Both Storybook stories (`UZF-18`'s ≥3 previews) and reducer/selector unit tests consume
`<Feature>Mocks`; the domain `<name>Mocks` fixtures feed the `Profile`/`Exception` values
inside them. **Do not construct `State` (or a preload fragment) inline in a story or a test**
— add a named variant to `<Feature>Mocks` instead, even for a one-off scenario.

## Forbidden

- Models with **fewer than 7** `mock*` variants in `__mocks__/<Name>.mocks.ts`.
- Mocks scattered across test files instead of the model's `__mocks__` sibling file.
- A story or a test constructing `State` (or a `preloadedState` fragment) **inline** instead of
  via `<Feature>Mocks`.
- A `Response`, a raw thrown value, or an `Error`/`string` stored inside `<Feature>State`.
  Always translate to `<Name>Exception` at the boundary via `Mapper.toException`.
- A `Page`, `Fragment`, reducer, or selector importing a `…Response` type — Responses cross
  only Service → Producer → Mapper.
- A second, ad hoc error-to-exception mapping function living beside the Producer instead of
  inside the Mapper's `toException`.
- Domain Models with wire-format field names (`snake_case`, abbreviations copied from the
  payload) — rename on the Model; bridge the two in the Mapper, never in the type.
- A `switch` over `Exception.kind` (or any Event/Exception union) missing the trailing
  `assertNever(...)` exhaustiveness check.
