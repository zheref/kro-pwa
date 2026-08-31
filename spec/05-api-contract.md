# 05 — API Contract

> **STUB — deliberately empty.** This file states what will fill it and when. It does not
> describe an API this repo has, because it has none.

## Why it is empty

The Scenario 5 template assumes a TypeSpec contract compiled into a `packages/api` workspace
member (`make codegen`). **kro-pwa has neither**, and adding one would be a fabricated
architecture:

- Kro's backend is **Kro Cloud (Supabase)**, whose schema is owned by `zheref/KroApple`. This
  repo is a client. It writes no migrations and defines no server contract
  (Stack Matrix cross-cutting rule; epic #1 "Out of scope").
- `make codegen` is a documented no-op today, and `spec/architecture/README.md` records that the
  **only** generated tree in this repo is `.claude/rules/`. Standing up an unused TypeSpec
  pipeline would make that statement false.
- There is no `packages/api` workspace member, and no dependency for one is installed.

## What fills it, and when

| Filled by | With |
|---|---|
| **#31 — Auth & cloud sync (Supabase)** | The read/write surface this client actually uses against Kro Cloud: tables and views touched, the RLS assumptions each call relies on (`SEC-6`), the sync scopes per settings key, and the conflict/soft-delete rules (`lastSyncedAt`). |
| **#33 — Google Calendar integration** | The external-host contract: which Google Calendar API operations back reconciliation, the token/scopes the client holds, and the failure taxonomy the Mapper translates. |
| **#34 — PWA platform services** | The Web Push contract (subscription shape, the server route that sends), since that is the one place this repo does own an endpoint. |

Each of those fills its own section here as it lands. Until then this file stays a stub rather
than a plausible-looking placeholder.

## The shape it must take when filled

Whatever the source, the boundary rules do not move:

- Wire types are **`Response` types** mirroring the wire format exactly, never imported outside
  the Service → Producer → Mapper path (`RC-29`).
- Every boundary is **parsed, not cast** (`SEC-7`); a failure becomes a typed `…Exception` via
  the Mapper's `toException` (`RC-30`).
- Every external system sits behind a `<X>Service` injected through `ThunkExtra`, with a
  `stubbed<X>Service` twin and a backing fixture — no exceptions (`RC-33`). Tests never reach
  the live network (`RC-35`).
- Next.js **route handlers and Server Actions are Producers**: they call Services and return a
  `Result` (`RC-43`), and carry ≥3 tests asserting on that `Result`.

## Existing endpoints (pre-parity, to be reworked)

`apps/web/src/app/api/` currently holds NextAuth and a Google `createEvent` route from the
pre-parity app. They predate the UZF wiring and do not follow the rules above. #31 and #33 own
their replacement; they are listed here so the gap is visible rather than implied.
