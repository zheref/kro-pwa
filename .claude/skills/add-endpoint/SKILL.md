---
name: add-endpoint
description: Reach an external system from Kro Web the react-uzf-v1 way — a Service behind ThunkExtra with a stubbed twin, or a Next.js route handler / Server Action written as a Producer. Use when adding any network, storage or platform-API call.
---

# Skill: add-endpoint

"Endpoint" means one of two things here. Pick the right one first — they are not
interchangeable.

| You are… | Build | Lives in |
|---|---|---|
| **Calling** an external system (Kro Cloud, Google Calendar, Web Push, IndexedDB, a browser API) | a **Service** injected through `ThunkExtra` | `packages/app/src/services/<x>/` |
| **Serving** something over HTTP from this app (a webhook, a push-send, an OAuth callback) | a **route handler / Server Action**, written as a Producer | `apps/web/src/app/api/**` |

There is **no TypeSpec contract and no `packages/api`** in this repo, and `make codegen` is a
documented no-op. The Kro Cloud (Supabase) schema is owned by `zheref/KroApple`; this repo is a
client and writes no migration. Do not scaffold a generator to fill a gap that is deliberate —
see `spec/05-api-contract.md`.

---

## A. Adding a Service (the usual case)

### 1. Types in `@kro/core`

- `models/<X>Response.ts` — mirrors the **wire** format exactly, `snake_case` and all. Never
  imported outside the Service → Producer → Mapper path (`RC-29`).
- `models/<X>.ts` — the domain Model: domain types only, one per file, no wire field names
  (`RC-28`).
- `models/<X>Exception.ts` — a closed union built from `Exception<Kind>` plus an `<X>Exceptions`
  factory, and a copy function that derives user-facing text from `kind` (`RC-8`).
- `models/<X>Mapper.ts` — a plain object of pure functions `toDomain` / `fromDomain` /
  `toException`. The only conversion site (`RC-30`).
- `models/__mocks__/<X>.mocks.ts` — **≥7** variants (3 convenient / 1 neutral / 3 inconvenient),
  reachable via the `@kro/core/mocks` subpath (`RC-13`).

`@kro/core` is platform-free: no react, next, DOM globals or Node built-ins.
`scripts/check-platform-free.mjs` fails `make lint` if you slip.

### 2. The Service pair in `packages/app/src/services/<x>/`

Follow `services/greeting/GreetingService.ts` exactly:

```ts
export interface XService {
  verb(args, options?: { signal?: AbortSignal }): Promise<XResponse>
}

export const liveXService: XService = { … }      // may throw; returns the WIRE shape
export const stubbedXService: XService = { … }   // reads x.fixtures.json
```

- **A live-only Service is incomplete** (`RC-33`). Ship the `stubbed…` twin and its fixture in
  the same commit.
- The Service returns the wire shape and **is allowed to throw** — the `Result` boundary belongs
  to the Producer, not here.
- `fetch(` is legal **only** inside `src/services/**`; the boundary checker enforces it (`RC-3`).
- Accept and forward an `AbortSignal` so cancellation reaches the transport.
- Naming: `<X>Service` interface + `live<X>Service` + `stubbed<X>Service`, lower-camel object
  literals, never PascalCase classes (`RC-59`).
- **Platform-forked implementations** (browser storage vs. another host) are separate `live…`
  files behind one interface — never a runtime `Platform.OS`-style branch (`RC-48`).

### 3. Wire it into `ThunkExtra` — the only injection point

In `packages/app/src/library/store.ts`, one field on the interface plus one binding each in
`liveThunkExtra` and `stubbedThunkExtra`. Nothing outside that file (and test/mock files) may
import the Service module — the boundary checker fails the lint task if it does (`RC-6`,
`RC-21`). Do **not** export it from `packages/app/src/index.ts`.

### 4. Call it from a Producer

```ts
export const fetchXThunk = createAsyncThunk<
  Result<X, XException>, { /* narrow args */ }, { extra: ThunkExtra }
>('<feature>/onXFetchCompleted', async (args, { extra, signal }) => {
  try {
    const response = await extra.xService.fetch(args, { signal })
    const domain = XMapper.toDomain(response)
    return domain ? ok(domain) : err(XExceptions.malformed('…'))
  } catch (error) {
    return err(XMapper.toException(error))
  }
})
```

- The payload creator **never throws** (`RC-7`); `.rejected` stays a defensive fallback that
  returns early on `action.meta.aborted`.
- Narrow inputs only — never the whole `State`, never `getState()`.
- The type string is an **event name** (`'<feature>/onXFetchCompleted'`), never a mechanism
  (`RC-2`). Exported factories carry the `…Thunk` suffix (`RC-58`).

---

## B. Adding a route handler or Server Action

`apps/web/src/app/api/<segment>/route.ts`, or an `'use server'` action.

- **It is a Producer, not Page logic** (`RC-43`): it calls a Service and returns a `Result`. No
  business logic inline, no direct third-party SDK call in the handler body.
- **Parse the input at the boundary — never cast it** (`SEC-7`). A malformed body is a typed
  exception, not a 500.
- **Read every credential from the environment.** The pre-commit guard refuses a staged literal;
  `--no-verify` is never acceptable (`SEC-14`).
- **Authorisation belongs at the data layer.** Kro Cloud access is governed by Supabase RLS
  (`SEC-6`); a handler that trusts a client-supplied user id is a finding.
- Note: `apps/web/src/app/api/` still holds pre-parity NextAuth and Google routes that predate
  these rules. They are replaced by #31 / #33 — do not copy their shape.

---

## Tests (both cases)

- **Producer:** ≥3 cases dispatching the real thunk against `makeStore(stubbedThunkExtra)` —
  never a mocked `fetch`, never the live network (`RC-54`, `RC-35`).
- **Mapper:** ≥3 cases each for `toDomain` / `fromDomain` / `toException`.
- **Thunk lifecycle arms** in the slice: ≥3 (happy / failure / edge).
- **Route handler / Server Action:** ≥3 cases called directly with a stubbed Service, asserting
  on the returned `Result`.
- **Model:** ≥7 mocks.
- ≥80 % line coverage on every touched file; name any exemption in the PR body.

## Verify

```
make lint && make typecheck && make test && make build
```

`make lint` runs `check-platform-free.mjs` and `check-uzf-boundaries.mjs`, so a Service imported
from the wrong place, a stray `fetch`, or a `next/*` import in `@kro/app` fails here with the
rule id — not later in review.
